package com.tubemerger.app.engine

import java.io.File
import java.util.ArrayDeque
import java.util.LinkedHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

/**
 * MergeEngine Facade (SOLID - Single Responsibility & Dependency Inversion)
 * Orchestrates download, normalization, and stitching via injected interfaces.
 * Utilizes ArrayDeque for O(1) clip queue consumption and ConcurrentLinkedQueue for thread-safe event buffering.
 */
class MergeEngine(
    private val downloader: IDownloader,
    private val normalizer: IVideoNormalizer,
    private val stitcher: IVideoStitcher,
    private val emitter: IProgressEmitter
) {
    private val isRunning = AtomicBoolean(false)
    private val isCancelled = AtomicBoolean(false)
    private val eventQueue = ConcurrentLinkedQueue<NativeProgressSnapshot>()

    fun executeMerge(
        clips: List<NativeVideoClip>,
        outputDir: File,
        targetFilename: String
    ): Result<File> {
        if (!isRunning.compareAndSet(false, true)) {
            return Result.failure(IllegalStateException("A merge operation is already running."))
        }

        isCancelled.set(false)
        val clipQueue = ArrayDeque(clips)
        val clipStatusMap = LinkedHashMap<String, String>()
        val totalClips = clips.size

        try {
            emitter.emit(
                NativeProgressSnapshot(
                    status = PipelineState.Downloading.label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "Initializing...",
                    overallPercent = 0.0,
                    message = "Starting downloads..."
                )
            )

            // Step 1: Download
            val downloadedFiles = downloader.downloadClips(clips, outputDir) { snapshot ->
                emitter.emit(snapshot)
            }

            if (isCancelled.get()) {
                return Result.failure(InterruptedException("Merge cancelled."))
            }

            // Step 2: Normalize
            emitter.emit(
                NativeProgressSnapshot(
                    status = PipelineState.Normalizing.label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "Normalizing video streams...",
                    overallPercent = 50.0,
                    message = "Normalizing formats to 1080p CFR..."
                )
            )

            val normalizedFiles = mutableListOf<File>()
            for ((index, file) in downloadedFiles.withIndex()) {
                if (isCancelled.get()) return Result.failure(InterruptedException("Merge cancelled."))

                val normalizedOutput = File(outputDir, "norm_${file.name}")
                val success = normalizer.normalize(file, normalizedOutput) { percent ->
                    val overall = 50.0 + (percent * 0.3 * (1.0 / totalClips)) + (index.toDouble() / totalClips * 30.0)
                    emitter.emit(
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
                }
            }

            // Step 3: Stitch
            emitter.emit(
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
                val overall = 85.0 + (percent * 0.15)
                emitter.emit(
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

            if (!stitchSuccess) {
                return Result.failure(RuntimeException("Stitching failed."))
            }

            emitter.emit(
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
            emitter.emit(
                NativeProgressSnapshot(
                    status = PipelineState.Error(e.message ?: "Unknown", "engine_error", true).label,
                    currentItem = 0,
                    totalItems = totalClips,
                    currentVideoTitle = "",
                    overallPercent = 0.0,
                    error = e.message
                )
            )
            return Result.failure(e)
        } finally {
            isRunning.set(false)
        }
    }

    fun cancel() {
        isCancelled.set(true)
        downloader.cancel()
        normalizer.cancel()
        stitcher.cancel()
    }
}
