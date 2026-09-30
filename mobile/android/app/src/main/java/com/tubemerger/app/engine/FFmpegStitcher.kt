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

        val concatListFile = File(outputFile.parentFile, "concat_list_${System.currentTimeMillis()}.txt")
        FileWriter(concatListFile).use { writer ->
            for (file in inputFiles) {
                writer.write("file '${file.absolutePath}'\n")
            }
        }

        Log.i(TAG, "Stitching ${inputFiles.size} files into ${outputFile.name}")

        val args = listOf(
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concatListFile.absolutePath,
            "-c", "copy",
            "-movflags", "+faststart",
            outputFile.absolutePath
        )

        val result = executor.execute(args) { line ->
            if (line.contains("size=")) {
                onProgress(60.0)
            }
        }

        concatListFile.delete()
        onProgress(100.0)
        return result.exitCode == 0 && outputFile.exists() && outputFile.length() > 0
    }

    override fun cancel() {
        executor.cancel()
    }
}
