package com.tubemerger.app.engine

import java.io.File

/**
 * Interface Segregation: Video processing contracts for FFmpeg normalizer & stitcher.
 */
interface IVideoNormalizer {
    fun normalize(
        inputFile: File,
        outputFile: File,
        targetWidth: Int = 1920,
        targetHeight: Int = 1080,
        fps: Int = 30,
        onProgress: (percent: Double) -> Unit
    ): Boolean

    fun cancel()
}

interface IVideoStitcher {
    fun concatenate(
        inputFiles: List<File>,
        outputFile: File,
        onProgress: (percent: Double) -> Unit
    ): Boolean

    fun cancel()
}
