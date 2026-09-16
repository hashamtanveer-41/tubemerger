"""Metadata extractor service for YouTube playlists and videos."""

import json
import logging
import os
import subprocess
from typing import Any, Dict, Optional, Tuple

from tubemerge.apps.playlists.diagnostics import MediaFetchError, diagnose_extraction_error
from tubemerge.apps.playlists.models import Playlist, VideoClip
from tubemerge.utils.process import get_hidden_subprocess_kwargs

logger = logging.getLogger(__name__)


class PlaylistMetadataService:
    """Encapsulates probing and extracting metadata for YouTube playlists and videos."""

    def __init__(self, ytdlp_path: Optional[str] = None):
        self.ytdlp_path = ytdlp_path

    @staticmethod
    def sanitize_url(raw_url: str) -> str:
        """Strip surrounding quotes, whitespace, and clean query params."""
        if not raw_url:
            return ""
        url = raw_url.strip().strip("'\"").strip()
        return url

    def _parse_playlist_data(self, data: Dict[str, Any], clean_url: str) -> Playlist:
        entries = []
        raw_entries = data.get("entries")
        if raw_entries is None and data.get("id"):
            raw_entries = [data]
        elif raw_entries is None:
            raw_entries = []

        cover_thumb = data.get("thumbnail")

        channel_default = (
            data.get("channel")
            or data.get("uploader")
            or data.get("playlist_uploader")
            or data.get("channel_id")
            or "YouTube Creator"
        )

        for item in raw_entries:
            if not item:
                continue
            video_id = item.get("id") or ""
            video_title = (
                item.get("title")
                or item.get("fulltitle")
                or item.get("track")
                or (f"Video {video_id}" if video_id else "Untitled Video")
            ).strip()
            video_url = item.get("url") or (f"https://www.youtube.com/watch?v={video_id}" if video_id else "")
            raw_dur = item.get("duration")
            if raw_dur is not None and float(raw_dur) > 0:
                duration = int(float(raw_dur))
            else:
                # Fallback to ms if present, otherwise default to standard 4m (240s) so size calculations succeed
                approx_ms = item.get("approximate_duration_ms") or item.get("duration_ms")
                duration = int(approx_ms / 1000) if approx_ms else 240

            # Thumbnails
            thumb = None
            if item.get("thumbnails"):
                thumb = item["thumbnails"][-1].get("url")
            elif item.get("thumbnail"):
                thumb = item["thumbnail"]
            elif video_id:
                thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

            if not cover_thumb and thumb:
                cover_thumb = thumb

            width = int(item.get("width") or 0)
            height = int(item.get("height") or 0)
            fps = float(item.get("fps") or 0.0)

            clip = VideoClip(
                id=video_id,
                title=video_title,
                url=video_url,
                duration_seconds=duration,
                thumbnail_url=thumb,
                width=width,
                height=height,
                fps=fps,
            )
            entries.append(clip)

        pl_title = data.get("title")
        if not pl_title or pl_title == "NA":
            pl_title = entries[0].title if len(entries) == 1 else "YouTube Playlist"

        return Playlist(
            playlist_id=data.get("id") or "",
            title=pl_title,
            channel=channel_default,
            webpage_url=data.get("webpage_url") or clean_url,
            entries=entries,
            thumbnail=cover_thumb,
        )

    def fetch_playlist(self, url: str) -> Playlist:
        """Fetch playlist metadata via in-process yt_dlp or CLI fallback with robust error categorization."""
        clean_url = self.sanitize_url(url)
        if not clean_url:
            raise MediaFetchError("Please paste a YouTube playlist or video URL to begin.", title="Empty URL", status_code=400)

        # Early check for known unsupported or malformed links before invoking yt-dlp
        diag = diagnose_extraction_error(clean_url, "")
        if diag.title in (
            "Spotify Not Supported",
            "Apple Music Not Supported",
            "Streaming Service Not Supported",
            "DRM Protected Platform",
            "Invalid URL Format",
            "Multiple Links Detected",
            "Malformed Playlist URL",
        ):
            raise diag

        # 1. Primary: In-process yt_dlp Python module (fast, zero subprocess overhead, cross-platform)
        try:
            import yt_dlp
            ydl_opts = {
                "extract_flat": True,
                "skip_download": True,
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 15,
                "retries": 1,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                data = ydl.extract_info(clean_url, download=False)
                if data:
                    return self._parse_playlist_data(data, clean_url)
        except Exception as exc:
            err_diag = diagnose_extraction_error(clean_url, str(exc))
            # If it's a permanent semantic error (DRM, Bad Request 400, Private, 404, Age, Region, etc.), do NOT waste time on CLI fallback
            if err_diag.title != "Invalid Link":
                raise err_diag
            logger.warning(f"In-process yt_dlp extraction failed: {exc}. Attempting CLI fallback...")

        # 2. Secondary fallback: CLI subprocess if executable path exists
        if self.ytdlp_path and os.path.isfile(self.ytdlp_path):
            cmd = [
                self.ytdlp_path,
                "-J",
                "--flat-playlist",
                "--no-warnings",
                "--socket-timeout", "15",
                "--retries", "1",
                clean_url,
            ]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=45, **get_hidden_subprocess_kwargs())
                if res.returncode == 0:
                    data = json.loads(res.stdout)
                    return self._parse_playlist_data(data, clean_url)
                else:
                    raise diagnose_extraction_error(clean_url, res.stderr)
            except subprocess.TimeoutExpired:
                raise MediaFetchError("YouTube request timed out. Please check your internet connection.", title="Request Timed Out", status_code=504)
            except MediaFetchError:
                raise
            except Exception as exc:
                raise diagnose_extraction_error(clean_url, str(exc))

        raise diagnose_extraction_error(clean_url, "Could not fetch playlist metadata.")

    def probe_canvas(self, video_url: str) -> Tuple[int, int, int]:
        """Inspect stream metadata to determine master canvas."""
        # 1. In-process extraction
        try:
            import yt_dlp
            ydl_opts = {
                "skip_download": True,
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 10,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                d = ydl.extract_info(video_url, download=False)
                w = int(d.get("width") or 1920)
                h = int(d.get("height") or 1080)
                fps = int(round(float(d.get("fps") or 30)))
                return w, h, fps
        except Exception:
            pass

        # 2. CLI fallback
        if self.ytdlp_path and os.path.isfile(self.ytdlp_path):
            cmd = [
                self.ytdlp_path,
                "-j",
                "--no-playlist",
                "--no-warnings",
                "--socket-timeout", "10",
                video_url,
            ]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=20, **get_hidden_subprocess_kwargs())
                if res.returncode == 0:
                    d = json.loads(res.stdout)
                    w = int(d.get("width") or 1920)
                    h = int(d.get("height") or 1080)
                    fps = int(round(float(d.get("fps") or 30)))
                    return w, h, fps
            except Exception:
                pass

        return 1920, 1080, 30
