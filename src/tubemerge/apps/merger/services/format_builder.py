"""CLI argument and format string builder for yt-dlp executions."""

from pathlib import Path
from typing import List, Optional

from tubemerge.core import settings


def get_ytdlp_format_filter(quality: str) -> str:
    """Determine the optimal yt-dlp format filter string based on desired resolution."""
    q = (quality or "").lower()
    if "4k" in q or "2160" in q:
        return "bv*[height<=2160][ext=mp4]+ba[ext=m4a]/b[height<=2160][ext=mp4]/best"
    elif "720" in q:
        return "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/best"
    elif "480" in q:
        return "bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/best"
    elif "360" in q:
        return "bv*[height<=360][ext=mp4]+ba[ext=m4a]/b[height<=360][ext=mp4]/best"
    elif "1080" in q:
        return "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best"
    else:
        return "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"


def get_audio_quality_flag(quality_or_bitrate: Optional[str]) -> str:
    """Translate audio quality/bitrate string to ffmpeg/yt-dlp quality flag."""
    q = str(quality_or_bitrate or "").lower().strip()
    if "320" in q:
        return "320k"
    elif "256" in q:
        return "256k"
    elif "192" in q:
        return "192k"
    elif "128" in q:
        return "128k"
    return "0"


def build_download_command(
    ytdlp_path: str,
    ffmpeg_path: str,
    out_template: str,
    url: str,
    is_audio: bool = False,
    quality: Optional[str] = None,
    audio_bitrate: Optional[str] = None,
    is_batch: bool = False,
    archive_path: Optional[Path] = None,
) -> List[str]:
    """Construct complete command-line argument list for yt-dlp download."""
    cache_dir = str(settings.APP_DATA_DIR / "ytdlp_cache")

    common_flags = [
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--ignore-errors",
        "--socket-timeout", "30",
        "--retries", "3",
        "--fragment-retries", "5",
        "--extractor-args", "youtube:player_client=android,web",
        "--cache-dir", cache_dir,
    ]

    if archive_path:
        common_flags.extend(["--download-archive", str(archive_path)])

    if is_audio:
        cmd = [
            ytdlp_path,
            "--ffmpeg-location", ffmpeg_path,
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", get_audio_quality_flag(quality or audio_bitrate),
            "-o", out_template,
        ] + common_flags
    else:
        cmd = [
            ytdlp_path,
            "--ffmpeg-location", ffmpeg_path,
            "-f", get_ytdlp_format_filter(quality or ""),
            "-o", out_template,
        ] + common_flags

    if is_batch:
        cmd.extend(["--sleep-interval", "1", "--max-sleep-interval", "2"])

    cmd.extend([
        "--progress-template",
        "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
        url,
    ])
    return cmd
