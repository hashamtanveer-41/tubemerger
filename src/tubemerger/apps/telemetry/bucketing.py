"""Privacy-preserving scalar bucketing utilities for anonymous telemetry."""


def bucket_clips(clip_count: int) -> str:
    """Bucket video count into coarse intervals."""
    if clip_count <= 5:
        return "1-5"
    if clip_count <= 15:
        return "6-15"
    if clip_count <= 30:
        return "16-30"
    if clip_count <= 50:
        return "31-50"
    return "50+"


def bucket_duration(duration_seconds: float) -> str:
    """Bucket duration into coarse intervals."""
    if duration_seconds < 60:
        return "<1m"
    if duration_seconds < 300:
        return "1-5m"
    if duration_seconds < 900:
        return "5-15m"
    return "15m+"


def bucket_size(size_mb: float) -> str:
    """Bucket media file size into coarse intervals."""
    if size_mb < 100:
        return "<100MB"
    if size_mb < 500:
        return "100-500MB"
    if size_mb < 1000:
        return "500MB-1GB"
    if size_mb < 5000:
        return "1-5GB"
    return "5GB+"
