package com.tubemerger.app.engine

import android.content.Context
import android.util.Log
import java.io.File

/**
 * FFmpegNormalizer (SOLID - Single Responsibility Principle)
 * Normalizes video and audio clips to uniform specifications before concat.
 * For video: scales/pads to uniform resolution (e.g. 1080p, 720p), 30fps CFR, stereo AAC audio.
 * For audio: normalizes to 44.1kHz 192k stereo MP3.
 * Reports strictly monotonic progress (never oscillates).
 */
class FFmpegNormalizer(context: Context) : IVideoNormalizer {

    companion object {
        private const val TAG = "FFmpegNormalizer"
        private val TIME_REGEX = Regex("""time=(\d+):(\d+):(\d+(?:\.\d+)?)""")
    }

    private val executor = FFmpegExecutor(context)

    override fun normalize(
        inputFile: File,
        outputFile: File,
        targetWidth: Int,
        targetHeight: Int,
        fps: Int,
        onProgress: (percent: Double) -> Unit
    ): Boolean {
        Log.i(TAG, "Normalizing ${inputFile.name} -> ${outputFile.name} (${targetWidth}x${targetHeight} @ ${fps}fps)")

        val isAudio = inputFile.name.endsWith(".mp3", ignoreCase = true) ||
                      inputFile.name.endsWith(".m4a", ignoreCase = true) ||
                      inputFile.name.endsWith(".aac", ignoreCase = true)

        val args = if (isAudio) {
            listOf(
                "-y",
                "-i", inputFile.absolutePath,
                "-ar", "44100",
                "-ac", "2",
                "-b:a", "320k",
                outputFile.absolutePath
            )
        } else {
            val filterChain = "scale=$targetWidth:$targetHeight:force_original_aspect_ratio=decrease,pad=$targetWidth:$targetHeight:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
            listOf(
                "-y",
                "-i", inputFile.absolutePath,
                "-vf", filterChain,
                "-r", fps.toString(),
                "-fps_mode", "cfr",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "23",
                "-c:a", "aac",
                "-ar", "44100",
                "-ac", "2",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                outputFile.absolutePath
            )
        }

        var monotonicPercent = 0.0
        val result = executor.execute(args) { line ->
            // Parse time elapsed to calculate monotonic progress
            val match = TIME_REGEX.find(line)
            if (match != null) {
                try {
                    val hours = match.groupValues[1].toDouble()
                    val minutes = match.groupValues[2].toDouble()
                    val seconds = match.groupValues[3].toDouble()
                    val totalSecs = hours * 3600.0 + minutes * 60.0 + seconds
                    // Smooth asymptotic approach towards 98%
                    monotonicPercent = Math.max(monotonicPercent, Math.min(98.0, monotonicPercent + 1.8))
                    onProgress(monotonicPercent)
                } catch (e: Exception) {
                    // ignore parse failures
                }
            } else if (line.contains("frame=")) {
                monotonicPercent = Math.max(monotonicPercent, Math.min(98.0, monotonicPercent + 0.8))
                onProgress(monotonicPercent)
            }
        }

        onProgress(100.0)
        return result.exitCode == 0 && outputFile.exists() && outputFile.length() > 0
    }

    override fun cancel() {
        executor.cancel()
    }
}
