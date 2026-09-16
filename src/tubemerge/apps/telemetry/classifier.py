"""yt-dlp error message classification and transient failure resolution detection."""

import re


def categorize_ytdlp_error(error_message: str) -> str:
    """Categorize raw yt-dlp error string into a standardized, privacy-safe error code for Aptabase."""
    msg = (error_message or "").lower().replace("’", "'").replace("`", "'")
    if "http error 429" in msg or "too many requests" in msg:
        return "rate_limited_429"
    elif "bot verification" in msg or "not a bot" in msg or "automated queries" in msg or "prove you're human" in msg or ("bot" in msg and "sign in" in msg):
        return "bot_detection"
    elif ("country" in msg and ("available" in msg or "blocked" in msg)) or "not available in your" in msg or "geographic restriction" in msg or "geo-restricted" in msg:
        return "geo_restricted"
    elif "copyright" in msg or "account terminated" in msg:
        return "copyright_takedown"
    elif "sign in to confirm your age" in msg or "age-restricted" in msg or "age confirmation" in msg:
        return "age_restricted"
    elif "live event will begin" in msg or "this live stream recording is not available" in msg:
        return "live_stream"
    elif "ffmpeg not found" in msg or "ffprobe not found" in msg or "avprobe not found" in msg or "ffmpeg is not installed" in msg:
        return "missing_ffmpeg_binary"
    elif "format not available" in msg or "format is not available" in msg or "no video formats found" in msg or "no suitable format" in msg:
        return "format_not_available"
    elif "private video" in msg or "this video is private" in msg or "video unavailable" in msg or "this video has been removed" in msg or "does not exist" in msg:
        return "video_unavailable"
    elif "network is unreachable" in msg or "timed out" in msg or "socket timeout" in msg or "connection reset" in msg or "name or service not known" in msg or "remote end closed connection" in msg:
        return "network_timeout"
    elif "no space left on device" in msg or "disk full" in msg:
        return "disk_full"
    elif "permission denied" in msg or "access is denied" in msg:
        return "permission_denied"
    else:
        # Strip sensitive personal file paths (e.g. /home/..., C:\Users\..., etc.)
        sanitized = re.sub(r'(?:/home/[^/\s]+|C:\\Users\\[^\\]+)', '[PATH]', error_message or "")
        clean_msg = re.sub(r'["\',:;\[\]{}()\\/]', ' ', sanitized[:40]).strip()
        clean_msg = re.sub(r'\s+', '_', clean_msg).strip('_')
        return f"other_{clean_msg}" if clean_msg else "other_unknown"


def is_resolvable_error(error_subtype: str) -> bool:
    """Returns True if retrying with backoff or refreshed connection could resolve the failure."""
    return error_subtype in (
        "rate_limited_429",
        "network_timeout",
        "bot_detection",
        "other_unknown",
    ) or error_subtype.startswith("other_")
