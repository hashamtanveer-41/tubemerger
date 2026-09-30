package com.tubemerger.app.engine

/**
 * Sealed class representing finite states of the media pipeline.
 * Guarantees compile-time exhaustiveness when handling states.
 */
sealed class PipelineState {
    object Idle : PipelineState()
    object Fetching : PipelineState()
    object Downloading : PipelineState()
    object Paused : PipelineState()
    object Normalizing : PipelineState()
    object Stitching : PipelineState()
    object EmbeddingChapters : PipelineState()
    object Done : PipelineState()
    object Cancelled : PipelineState()
    data class Error(val message: String, val subtype: String, val isResolvable: Boolean) : PipelineState()

    val label: String
        get() = when (this) {
            is Idle -> "idle"
            is Fetching -> "fetching"
            is Downloading -> "downloading"
            is Paused -> "paused"
            is Normalizing -> "normalizing"
            is Stitching -> "stitching"
            is EmbeddingChapters -> "embedding_chapters"
            is Done -> "done"
            is Cancelled -> "cancelled"
            is Error -> "error"
        }
}
