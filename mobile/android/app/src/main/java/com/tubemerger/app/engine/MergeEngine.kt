package com.tubemerger.app.engine

import android.util.Log
import java.io.File
import java.util.ArrayDeque
import java.util.LinkedHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

/**
 * MergeEngine (SOLID - Orchestrator)
 * Coordinates the full multi-stage pipeline: Download -> Normalize -> Stitch -> Done.
 * Guarantees strictly monotonic progress delivery without oscillations or backward jumps.
 * Isolates intermediate clips in a dedicated staging directory and cleans them up automatically.
 */
class MergeEngine(
    private val downloader: IDownloader,
    private val normalizer: IVideoNormalizer,
    private val stitcher: IVideoStitcher,
    private val emitter: IProgressEmitter
) {
    companion object {
        private const val TAG = "MergeEngine"
    }

    private val isRunning = AtomicBoolean(false)
    private val isCancelled = AtomicBoolean(false)
    private var pipelineHighWaterMark = 0.0

    private fun emitMonotonic(snapshot: NativeProgressSnapshot) {
        val clampedPercent = Math.max(pipelineHighWaterMark, Math.min(100.0, snapshot.overallPercent))
        pipelineHighWaterMark = clampedPercent
        emitter.emit(snapshot.copy(overallPercent = clampedPercent))
    }

    fun executeMerge(
        clips: List<NativeVideoClip>,
        outputDir: File,
        stagingDir: File,
        targetFilename: String,
        quality: String = "1080p",
        format: String = "mp4"
    ): Result<File> {
        if (!isRunning.compareAndSet(false, true)) {
            return Result.failure(IllegalStateException("A merge operation is already running."))
        }

        isCancelled.set(false)
        pipelineHighWaterMark = 0.0
        val totalClips = clips.size

        if (!outputDir.exists()) outputDir.mkdirs()
        if (!stagingDir.exists()) stagingDir.mkdirs()

        val (targetWidth, targetHeight) = when (quality.lowercase()) {
            "720p" -> Pair(1280, 720)
            "480p" -> Pair(854, 480)
            "360p" -> Pair(640, 360)
            else -> Pair(1920, 1080)
        }

        try {
            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Downloading.label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "Initializing...",
                    overallPercent = 0.0,
                    message = "Resolving stream formats and checking metadata...",
                    subStatus = "Resolving stream formats and checking metadata..."
                )
            )

            // Step 1: Download into staging directory (0% -> 50%)
            val downloadedFiles = downloader.downloadClips(clips, stagingDir, quality, format) { snapshot ->
                emitMonotonic(snapshot)
            }

            if (isCancelled.get()) {
                return Result.failure(InterruptedException("Merge cancelled."))
            }

            // Step 2: Normalize (50% -> 85%)
            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Normalizing.label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "Normalizing media streams...",
                    overallPercent = 50.0,
                    message = "Normalizing formats (${quality})..."
                )
            )

            val normalizedFiles = mutableListOf<File>()
            for ((index, file) in downloadedFiles.withIndex()) {
                if (isCancelled.get()) return Result.failure(InterruptedException("Merge cancelled."))

                val normalizedOutput = File(stagingDir, "norm_${file.name}")
                val success = normalizer.normalize(file, normalizedOutput, targetWidth, targetHeight, 30) { percent ->
                    val normSlot = 35.0 / totalClips
                    val normBase = 50.0 + (index.toDouble() * normSlot)
                    val overall = normBase + (percent / 100.0 * normSlot)

                    emitMonotonic(
                        NativeProgressSnapshot(
                            status = PipelineState.Normalizing.label,
                            currentItem = index + 1,
                            totalItems = totalClips,
                            currentVideoTitle = file.name,
                            overallPercent = overall,
                            message = "Normalizing clip ${index + 1} of $totalClips"
                        )
                    )
                }

                if (success) {
                    normalizedFiles.add(normalizedOutput)
                } else {
                    Log.w(TAG, "Normalization failed for ${file.name}, using raw clip as fallback")
                    normalizedFiles.add(file)
                }
            }

            // Step 3: Stitch into final output directory (85% -> 98%)
            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Stitching.label,
                    currentItem = totalClips,
                    totalItems = totalClips,
                    currentVideoTitle = "Stitching clips together...",
                    overallPercent = 85.0,
                    message = "Merging into final output..."
                )
            )

            val finalOutput = File(outputDir, targetFilename)
            val stitchSuccess = stitcher.concatenate(normalizedFiles, finalOutput) { percent ->
                val overall = 85.0 + (percent / 100.0 * 13.0)
                emitMonotonic(
                    NativeProgressSnapshot(
                        status = PipelineState.Stitching.label,
                        currentItem = totalClips,
                        totalItems = totalClips,
                        currentVideoTitle = targetFilename,
                        overallPercent = overall,
                        message = "Finalizing output file..."
                    )
                )
            }

            if (!stitchSuccess || !finalOutput.exists() || finalOutput.length() == 0L) {
                return Result.failure(RuntimeException("Stitching failed or output file is empty."))
            }

            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Stitching.label,
                    currentItem = totalClips,
                    totalItems = totalClips,
                    currentVideoTitle = targetFilename,
                    overallPercent = 100.0,
                    message = "Muxing video containers and writing chapter metadata...",
                    subStatus = "Muxing video containers and writing chapter metadata..."
                )
            )

            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Done.label,
                    currentItem = totalClips,
                    totalItems = totalClips,
                    currentVideoTitle = targetFilename,
                    overallPercent = 100.0,
                    message = "Merge completed successfully!",
                    outputFile = finalOutput.absolutePath
                )
            )

            return Result.success(finalOutput)
        } catch (e: Exception) {
            emitMonotonic(
                NativeProgressSnapshot(
                    status = PipelineState.Error(e.message ?: "Unknown", "engine_error", true).label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "",
                    overallPercent = pipelineHighWaterMark,
                    error = e.message
                )
            )
            return Result.failure(e)
        } finally {
            isRunning.set(false)
            // Clean up staging directory completely to prevent storage leaks and duplicate listings
            try {
                stagingDir.deleteRecursively()
                Log.i(TAG, "Cleaned up staging directory: ${stagingDir.absolutePath}")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to clean up staging directory: ${e.message}")
            }
        }
    }

    fun cancel() {
        isCancelled.set(true)
        downloader.cancel()
        normalizer.cancel()
        stitcher.cancel()
    }
}
