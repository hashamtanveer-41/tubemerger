package com.tubemerger.app.engine

import android.content.Context
import android.util.Log
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.atomic.AtomicBoolean

data class ProcessResult(
    val exitCode: Int,
    val output: String,
    val error: String
)

/**
 * FFmpegExecutor (SOLID - Single Responsibility Principle)
 * Handles low-level process spawning and execution for libffmpeg.so on Android.
 * Injects required dynamic linker paths (LD_LIBRARY_PATH) for FFmpeg 7.1.1.
 */
class FFmpegExecutor(private val context: Context) {

    companion object {
        private const val TAG = "FFmpegExecutor"
    }

    private var activeProcess: Process? = null
    private val isCancelled = AtomicBoolean(false)

    fun execute(
        args: List<String>,
        onLine: ((String) -> Unit)? = null
    ): ProcessResult {
        isCancelled.set(false)
        val binDir = File(context.applicationInfo.nativeLibraryDir)
        val ffmpegBin = File(binDir, "libffmpeg.so")

        if (!ffmpegBin.exists()) {
            throw IllegalStateException("libffmpeg.so binary not found at ${ffmpegBin.absolutePath}")
        }

        val ffmpegLibDir = File(context.noBackupFilesDir, "youtubedl-android/packages/ffmpeg/usr/lib")
        val pythonLibDir = File(context.noBackupFilesDir, "youtubedl-android/packages/python/usr/lib")

        val ldLibraryPath = "${ffmpegLibDir.absolutePath}:${pythonLibDir.absolutePath}:${binDir.absolutePath}"

        val fullCommand = mutableListOf<String>().apply {
            add(ffmpegBin.absolutePath)
            addAll(args)
        }

        Log.i(TAG, "Executing FFmpeg: ${fullCommand.joinToString(" ")}")

        val processBuilder = ProcessBuilder(fullCommand).apply {
            environment()["LD_LIBRARY_PATH"] = ldLibraryPath
            environment()["PATH"] = "${binDir.absolutePath}:${System.getenv("PATH") ?: "/system/bin"}"
            redirectErrorStream(true) // Merge stderr into stdout for ffmpeg progress tracking
        }

        val process = processBuilder.start()
        activeProcess = process

        val outputBuffer = StringBuilder()
        val reader = BufferedReader(InputStreamReader(process.inputStream))

        try {
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (isCancelled.get()) {
                    process.destroy()
                    return ProcessResult(-1, outputBuffer.toString(), "FFmpeg process cancelled.")
                }
                line?.let {
                    outputBuffer.append(it).append("\n")
                    onLine?.invoke(it)
                }
            }

            val exitCode = process.waitFor()
            return ProcessResult(exitCode, outputBuffer.toString(), if (exitCode != 0) outputBuffer.toString() else "")
        } finally {
            reader.close()
            activeProcess = null
        }
    }

    fun cancel() {
        isCancelled.set(true)
        activeProcess?.destroy()
    }
}
