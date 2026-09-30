package com.tubemerger.app.engine

import android.content.Context
import android.util.Log
import java.io.File

/**
 * FFmpegNormalizer (SOLID - Single Responsibility Principle)
 * Normalizes video clips to uniform 1080p, 30fps CFR, stereo AAC audio before concat.
 */
class FFmpegNormalizer(context: Context) : IVideoNormalizer {

    companion object {
        private const val TAG = "FFmpegNormalizer"
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
        Log.i(TAG, "Normalizing ${inputFile.name} -> ${outputFile.name}")

        val filterChain = "scale=$targetWidth:$targetHeight:force_original_aspect_ratio=decrease,pad=$targetWidth:$targetHeight:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"

        val args = listOf(
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

        var processedFrames = 0
        val result = executor.execute(args) { line ->
            // Extract frame count for progress estimate
            if (line.contains("frame=")) {
                processedFrames += 15
                val estimated = (processedFrames % 100).toDouble()
                onProgress(estimated)
            }
        }

        onProgress(100.0)
        return result.exitCode == 0 && outputFile.exists() && outputFile.length() > 0
    }

    override fun cancel() {
        executor.cancel()
    }
}
