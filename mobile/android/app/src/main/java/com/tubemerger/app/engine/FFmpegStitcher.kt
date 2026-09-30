package com.tubemerger.app.engine

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileWriter

/**
 * FFmpegStitcher (SOLID - Single Responsibility Principle)
 * Concatenates normalized clips using the stream-copy concat demuxer.
 * High-speed concatenation without re-encoding.
 */
class FFmpegStitcher(context: Context) : IVideoStitcher {

    companion object {
        private const val TAG = "FFmpegStitcher"
    }

    private val executor = FFmpegExecutor(context)

    override fun concatenate(
        inputFiles: List<File>,
        outputFile: File,
        onProgress: (percent: Double) -> Unit
    ): Boolean {
        if (inputFiles.isEmpty()) return false

        // If only 1 file, simple move/copy
        if (inputFiles.size == 1) {
            val single = inputFiles[0]
            val success = single.copyTo(outputFile, overwrite = true).exists()
            onProgress(100.0)
            return success
        }

        val concatListFile = File(outputFile.parentFile ?: outputFile.absoluteFile.parentFile, "concat_list_${System.currentTimeMillis()}.txt")
        FileWriter(concatListFile).use { writer ->
            for (file in inputFiles) {
                writer.write("file '${file.absolutePath}'\n")
            }
        }

        Log.i(TAG, "Stitching ${inputFiles.size} files into ${outputFile.name}")

        val isMp3 = outputFile.name.endsWith(".mp3", ignoreCase = true)
        val args = mutableListOf(
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concatListFile.absolutePath,
            "-c", "copy"
        )
        if (!isMp3) {
            args.add("-movflags")
            args.add("+faststart")
        }
        args.add(outputFile.absolutePath)

        var monotonicPercent = 10.0
        onProgress(monotonicPercent)

        val result = executor.execute(args) { line ->
            if (line.contains("size=") || line.contains("time=")) {
                monotonicPercent = Math.max(monotonicPercent, Math.min(95.0, monotonicPercent + 15.0))
                onProgress(monotonicPercent)
            }
        }

        try {
            concatListFile.delete()
        } catch (e: Exception) {
            // ignore
        }

        onProgress(100.0)
        return result.exitCode == 0 && outputFile.exists() && outputFile.length() > 0
    }

    override fun cancel() {
        executor.cancel()
    }
}
