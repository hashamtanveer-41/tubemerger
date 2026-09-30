package com.tubemerger.app.engine

import java.io.File

data class NativeVideoClip(
    val id: String,
    val title: String,
    val url: String,
    val durationSeconds: Long
)

data class NativeProgressSnapshot(
    val status: String,
    val currentItem: Int,
    val totalItems: Int,
    val currentVideoTitle: String,
    val overallPercent: Double,
    val speed: String? = null,
    val eta: String? = null,
    val message: String = "",
    val outputFile: String? = null,
    val error: String? = null
)

/**
 * Interface Segregation: IDownloader handles only downloading streams.
 */
interface IDownloader {
    fun downloadClips(
        clips: List<NativeVideoClip>,
        outputDir: File,
        quality: String = "1080p",
        format: String = "mp4",
        onProgress: (NativeProgressSnapshot) -> Unit
    ): List<File>

    fun cancel()
}
