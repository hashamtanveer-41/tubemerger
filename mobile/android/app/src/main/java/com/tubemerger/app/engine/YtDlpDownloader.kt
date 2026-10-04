package com.tubemerger.app.engine

import android.util.Log
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/**
 * YtDlpDownloader (SOLID - Single Responsibility Principle)
 * Implements IDownloader using the native youtubedl-android library.
 * Streams clean, monotonic progress callbacks (percent, speed, ETA) for each clip.
 * Never leaks raw console logs to user-facing progress snapshots.
 */
class YtDlpDownloader : IDownloader {

    companion object {
        private const val TAG = "YtDlpDownloader"
        private val SPEED_REGEX = Regex("""(?i)\b([0-9.]+\s*(?:[KMG]i?B/s|[KMG]bps))\b""")
        private val ETA_REGEX = Regex("""(?i)\bETA\s+([0-9:]+)\b""")
    }

    private val isCancelled = AtomicBoolean(false)
    private var activeProcessId: String? = null

    override fun downloadClips(
        clips: List<NativeVideoClip>,
        outputDir: File,
        quality: String,
        format: String,
        onProgress: (NativeProgressSnapshot) -> Unit
    ): List<File> {
        isCancelled.set(false)
        if (!outputDir.exists()) {
            outputDir.mkdirs()
        }

        val downloadedFiles = mutableListOf<File>()
        val totalClips = clips.size
        var overallHighWaterMark = 0.0
        var lastKnownSpeed: String? = null

        val isAudioOnly = format.equals("mp3", ignoreCase = true)
        val maxResolutionHeight = when (quality.lowercase()) {
            "720p" -> 720
            "480p" -> 480
            "360p" -> 360
            else -> 1080
        }

        for ((index, clip) in clips.withIndex()) {
            if (isCancelled.get()) break

            // Progressive 1.5s - 3.0s jitter delay between successive clip extractions on playlists > 30 clips
            if (totalClips > 30 && index > 0) {
                val progression = index.toDouble() / totalClips
                val baseDelay = 1500L + (progression * 1000L).toLong()
                val jitter = (Math.random() * 500).toLong()
                val delayMs = Math.min(3000L, Math.max(1500L, baseDelay + jitter))
                try {
                    Thread.sleep(delayMs)
                } catch (e: InterruptedException) {
                    break
                }
            }

            val processId = "dl_${clip.id}_${System.currentTimeMillis()}"
            activeProcessId = processId

            val outputFileTemplate = File(outputDir, "${clip.id}.%(ext)s").absolutePath

            Log.i(TAG, "Starting download for clip ${index + 1}/$totalClips: ${clip.title} (Format: $format, Quality: $quality)")

            val request = YoutubeDLRequest(clip.url).apply {
                addOption("-o", outputFileTemplate)
                if (isAudioOnly) {
                    addOption("-f", "bestaudio/best")
                    addOption("-x")
                    addOption("--audio-format", "mp3")
                    addOption("--audio-quality", "0")
                } else {
                    addOption("-f", "bestvideo[height<=$maxResolutionHeight][ext=mp4]+bestaudio[ext=m4a]/best[height<=$maxResolutionHeight][ext=mp4]/best")
                }
                addOption("--no-mtime")
                addOption("--no-playlist")
                addOption("--no-warnings")
                addOption("--no-update")
                addOption("--socket-timeout", "45")
                addOption("--retries", "5")
                addOption("--fragment-retries", "10")
                addOption("--extractor-args", "youtube:player_client=android,web")
            }

            var clipMaxPercent = 0.0

            try {
                YoutubeDL.getInstance().execute(request, processId) { progressFloat, etaSeconds, line ->
                    if (isCancelled.get()) return@execute

                    // Extract download speed from log line if available
                    if (line != null) {
                        val speedMatch = SPEED_REGEX.find(line)?.groupValues?.get(1)
                        if (!speedMatch.isNullOrBlank()) {
                            lastKnownSpeed = speedMatch
                        }
                    }

                    // Format ETA cleanly (e.g., "1m 45s" or "32s")
                    val formattedEta = when {
                        etaSeconds > 0 -> {
                            val m = etaSeconds / 60
                            val s = etaSeconds % 60
                            if (m > 0) "${m}m ${s.toString().padStart(2, '0')}s" else "${s}s"
                        }
                        line != null -> {
                            ETA_REGEX.find(line)?.groupValues?.get(1)
                        }
                        else -> null
                    }

                    // Smooth clip progress monotonically (handles video -> audio stream resets)
                    val rawProgress = progressFloat.toDouble()
                    clipMaxPercent = Math.max(clipMaxPercent, rawProgress)

                    // Clip progress occupies its slice of the download phase (0.0 to 50.0%)
                    val clipSlotPercent = 50.0 / totalClips
                    val clipBasePercent = index.toDouble() * clipSlotPercent
                    val currentOverall = clipBasePercent + (clipMaxPercent / 100.0 * clipSlotPercent)

                    // Strictly monotonic overall progress
                    overallHighWaterMark = Math.max(overallHighWaterMark, Math.min(50.0, currentOverall))

                    onProgress(
                        NativeProgressSnapshot(
                            status = PipelineState.Downloading.label,
                            currentItem = index + 1,
                            totalItems = totalClips,
                            currentVideoTitle = clip.title,
                            overallPercent = overallHighWaterMark,
                            speed = lastKnownSpeed,
                            eta = formattedEta,
                            message = "Downloading clip ${index + 1} of $totalClips (${clipMaxPercent.toInt()}%)"
                        )
                    )
                }

                // Locate downloaded file (may be .mp4, .mkv, .webm, .mp3, .m4a)
                val targetFile = outputDir.listFiles()?.firstOrNull {
                    it.name.startsWith(clip.id) && !it.name.endsWith(".part") && !it.name.endsWith(".ytdl")
                }

                if (targetFile != null && targetFile.exists() && targetFile.length() > 0) {
                    downloadedFiles.add(targetFile)
                    Log.i(TAG, "Successfully downloaded clip ${index + 1}: ${targetFile.name} (${targetFile.length()} bytes)")
                } else {
                    throw RuntimeException("Downloaded file for clip ${clip.id} not found or empty.")
                }

                // Ensure high water mark reaches full slice for this clip
                overallHighWaterMark = Math.max(overallHighWaterMark, (index + 1).toDouble() / totalClips * 50.0)
            } catch (e: Exception) {
                if (isCancelled.get()) {
                    Log.i(TAG, "Download cancelled for clip ${clip.id}")
                    break
                }
                Log.e(TAG, "Download failed for clip ${clip.id}: ${e.message}", e)
                throw e
            } finally {
                activeProcessId = null
            }
        }

        return downloadedFiles
    }

    override fun cancel() {
        isCancelled.set(true)
        activeProcessId?.let { pid ->
            try {
                YoutubeDL.getInstance().destroyProcessById(pid)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to destroy download process $pid: ${e.message}")
            }
        }
    }
}
