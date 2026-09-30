package com.tubemerger.app.engine

import android.util.Log
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/**
 * YtDlpDownloader (SOLID - Single Responsibility Principle)
 * Implements IDownloader using the native youtubedl-android library.
 * Streams real-time progress callbacks (percent, speed, ETA) for each clip.
 */
class YtDlpDownloader : IDownloader {

    companion object {
        private const val TAG = "YtDlpDownloader"
    }

    private val isCancelled = AtomicBoolean(false)
    private var activeProcessId: String? = null

    override fun downloadClips(
        clips: List<NativeVideoClip>,
        outputDir: File,
        onProgress: (NativeProgressSnapshot) -> Unit
    ): List<File> {
        isCancelled.set(false)
        if (!outputDir.exists()) {
            outputDir.mkdirs()
        }

        val downloadedFiles = mutableListOf<File>()
        val totalClips = clips.size

        for ((index, clip) in clips.withIndex()) {
            if (isCancelled.get()) break

            val processId = "dl_${clip.id}_${System.currentTimeMillis()}"
            activeProcessId = processId

            val outputFileTemplate = File(outputDir, "${clip.id}.%(ext)s").absolutePath

            Log.i(TAG, "Starting download for clip ${index + 1}/$totalClips: ${clip.title}")

            val request = YoutubeDLRequest(clip.url).apply {
                addOption("-o", outputFileTemplate)
                addOption("-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best")
                addOption("--no-mtime")
                addOption("--no-playlist")
                addOption("--no-warnings")
                addOption("--no-update")
                addOption("--socket-timeout", "45")
                addOption("--retries", "5")
                addOption("--fragment-retries", "10")
                addOption("--extractor-args", "youtube:player_client=android,web")
            }

            try {
                YoutubeDL.getInstance().execute(request, processId) { progressFloat, etaSeconds, line ->
                    if (isCancelled.get()) return@execute

                    val progress = progressFloat.toDouble()
                    val overall = (index.toDouble() / totalClips * 50.0) + (progress * 0.5 / totalClips)
                    val etaFormatted = if (etaSeconds > 0) "${etaSeconds}s" else null

                    onProgress(
                        NativeProgressSnapshot(
                            status = PipelineState.Downloading.label,
                            currentItem = index + 1,
                            totalItems = totalClips,
                            currentVideoTitle = clip.title,
                            overallPercent = overall,
                            speed = line,
                            eta = etaFormatted,
                            message = "Downloading clip ${index + 1} of $totalClips (${progress.toInt()}%)"
                        )
                    )
                }

                // Locate downloaded file (may be .mp4, .mkv, .webm)
                val targetFile = outputDir.listFiles()?.firstOrNull { it.name.startsWith(clip.id) && !it.name.endsWith(".part") }
                if (targetFile != null && targetFile.exists()) {
                    downloadedFiles.add(targetFile)
                    Log.i(TAG, "Successfully downloaded clip ${index + 1}: ${targetFile.name} (${targetFile.length()} bytes)")
                } else {
                    throw RuntimeException("Downloaded file for clip ${clip.id} not found on disk.")
                }
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
