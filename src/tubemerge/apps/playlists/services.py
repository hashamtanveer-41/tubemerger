"""Playlist Metadata Service - Interacts with yt-dlp to inspect playlists."""

import json
import logging
import os
import re
import subprocess
import sys
_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
from typing import Optional, Tuple, Any, Dict

from tubemerge.apps.playlists.models import Playlist, VideoClip
from tubemerge.utils.process import get_hidden_subprocess_kwargs

logger = logging.getLogger(__name__)

class MediaFetchError(Exception):
    """Structured, user-facing error with a clear title and guidance message."""
    def __init__(self, message: str, title: str = "Action Error", status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.title = title
        self.status_code = status_code


def diagnose_extraction_error(url: str, err_text: str = "") -> MediaFetchError:
    """Categorize URL or yt-dlp error text into precise, human-readable exceptions with contextual titles."""
    err_lower = (err_text or "").lower()
    url_lower = (url or "").lower()

    # 1. Multiple URLs concatenated together
    protocol_count = url_lower.count("http://") + url_lower.count("https://")
    if protocol_count > 1 or re.search(r'list=[^&]*https?://', url_lower):
        return MediaFetchError(
            "Multiple URLs were detected concatenated together in the search bar. "
            "Please clear the search input and paste only a single clean YouTube link.",
            title="Multiple Links Detected",
            status_code=422,
        )

    # 2. Spotify detection
    if "spotify.com" in url_lower:
        return MediaFetchError(
            "Spotify playlists cannot be downloaded directly because Spotify streams are protected by DRM encryption. "
            "Please search for the same playlist or tracks on YouTube and paste the YouTube link here.",
            title="Spotify Not Supported",
            status_code=422,
        )

    # 3. Apple Music / Tidal / Deezer detection
    if "music.apple.com" in url_lower or "itunes.apple.com" in url_lower:
        return MediaFetchError(
            "Apple Music playlists and tracks are protected by DRM encryption and cannot be extracted directly. "
            "Please paste a YouTube or YouTube Music playlist link instead.",
            title="Apple Music Not Supported",
            status_code=422,
        )
    if "tidal.com" in url_lower or "deezer.com" in url_lower:
        return MediaFetchError(
            "Commercial subscription streaming services use DRM encryption and cannot be downloaded. "
            "Please paste a YouTube or YouTube Music link instead.",
            title="Streaming Service Not Supported",
            status_code=422,
        )

    # 4. Netflix, Amazon Prime, Disney+, etc.
    if any(s in url_lower for s in ("netflix.com", "disneyplus.com", "primevideo.com", "hulu.com", "hbomax.com", "max.com")):
        return MediaFetchError(
            "Commercial video streaming platforms use Widevine DRM protection and cannot be downloaded. "
            "TubeMerger is designed for YouTube playlists and videos.",
            title="DRM Protected Platform",
            status_code=422,
        )

    # 5. Generic DRM protection detected from yt-dlp
    if "[drm]" in err_lower or "drm protection" in err_lower:
        return MediaFetchError(
            "This stream is encrypted with DRM protection and cannot be downloaded. "
            "Please provide a standard YouTube playlist or video URL.",
            title="DRM Encrypted Stream",
            status_code=422,
        )

    # 6. YouTube API 400 Bad Request / Invalid parameter / Malformed URL ID / Unable to download API page
    if any(s in err_lower for s in ("http error 400", "bad request", "unable to download api page")):
        return MediaFetchError(
            "YouTube rejected this request as invalid (Bad Request 400). "
            "The playlist ID or video parameter in this URL is corrupted, truncated, or malformed. "
            "Please verify the link in your browser and try pasting again.",
            title="Invalid Link Parameter",
            status_code=422,
        )

    # 7. Private or Deleted Content
    if "is private" in err_lower or "private video" in err_lower or "this video is private" in err_lower:
        return MediaFetchError(
            "This playlist or video is marked as Private. "
            "If you own this playlist, change its visibility to 'Public' or 'Unlisted' in YouTube Studio so TubeMerger can access it.",
            title="Private Content",
            status_code=422,
        )
    if any(s in err_lower for s in ("http error 404", "does not exist", "not found", "video unavailable", "this video has been removed")):
        return MediaFetchError(
            "This playlist or video could not be found on YouTube (404 Not Found). "
            "Please check the URL for typos or verify if the content was removed.",
            title="Content Not Found",
            status_code=404,
        )

    # 8. HTTP 403 Forbidden / Access restricted
    if any(s in err_lower for s in ("http error 403", "forbidden")):
        return MediaFetchError(
            "YouTube restricted access to this content (HTTP 403 Forbidden). "
            "The stream may be private, age-restricted, or require account verification.",
            title="Access Restricted",
            status_code=403,
        )

    # 9. Age restriction / Sign-in required / Bot verification
    if any(s in err_lower for s in ("sign in to confirm you’re not a bot", "sign in to confirm you're not a bot", "bot confirmation")):
        return MediaFetchError(
            "YouTube is temporarily requesting bot verification. "
            "Please wait 1–2 minutes before trying this URL again.",
            title="Bot Verification Required",
            status_code=429,
        )
    if any(s in err_lower for s in ("age-restricted", "sign in to confirm your age", "login required")):
        return MediaFetchError(
            "This video is age-restricted and requires YouTube account authentication to access. "
            "TubeMerger only downloads public, unrestricted streams.",
            title="Age-Restricted Video",
            status_code=403,
        )

    # 10. Geo-blocking
    if any(s in err_lower for s in ("not available in your country", "georestricted", "blocked it in your country")):
        return MediaFetchError(
            "This video has been geo-blocked in your region by the copyright holder.",
            title="Region Blocked",
            status_code=403,
        )

    # 11. Live stream
    if any(s in err_lower for s in ("live stream recording is not available", "is a live stream", "live event")):
        return MediaFetchError(
            "Live streams in progress cannot be downloaded or merged. "
            "Please wait until the live broadcast concludes.",
            title="Live Stream In Progress",
            status_code=422,
        )

    # 12. Invalid URL scheme or format
    if not url_lower.startswith("http://") and not url_lower.startswith("https://"):
        return MediaFetchError(
            "Invalid URL format. Please paste a full web link starting with https:// (e.g. https://www.youtube.com/playlist?list=...)",
            title="Invalid URL Format",
            status_code=400,
        )
    if "unsupported url" in err_lower or "is not a valid url" in err_lower:
        return MediaFetchError(
            "This website or link format is not recognized. TubeMerger is optimized for YouTube playlists, videos, and Shorts.",
            title="Unsupported Platform",
            status_code=422,
        )

    # 13. Network / DNS / Timeout
    if any(s in err_lower for s in ("connection refused", "network is unreachable", "temporary failure in name resolution", "nodename nor servname", "name or service not known")):
        return MediaFetchError(
            "Unable to connect to the video host. Please check your internet connection or DNS settings.",
            title="Network Connection Failed",
            status_code=502,
        )
    if "timed out" in err_lower or "timeout" in err_lower:
        return MediaFetchError(
            "The request to YouTube timed out. Please check your internet connection and try again.",
            title="Request Timed Out",
            status_code=504,
        )

    # 14. Fallback: Clean all yt-dlp & Python technical internals from raw error text
    clean_msg = err_text.strip()
    clean_msg = re.sub(r'^(ERROR:\s*)+', '', clean_msg, flags=re.IGNORECASE)
    clean_msg = re.sub(r'\[[a-zA-Z0-9_:.\-]+\]\s*', '', clean_msg)
    clean_msg = re.sub(r'^[a-zA-Z0-9_\-:]+::\s*', '', clean_msg)
    clean_msg = re.sub(r'\(caused by <[^>]+>\)', '', clean_msg)
    clean_msg = re.sub(r'\(caused by [^)]+\)', '', clean_msg)
    clean_msg = re.sub(r':\s*:', ':', clean_msg).strip(' :;\t\r\n')

    if any(s in clean_msg.lower() for s in ("400", "bad request", "unable to download api page")):
        return MediaFetchError(
            "YouTube rejected this request as invalid (Bad Request 400). "
            "The playlist ID or video parameter in this URL is malformed or invalid. Please verify the link.",
            title="Invalid Link Parameter",
            status_code=422,
        )

    if not clean_msg or clean_msg.lower().startswith("could not fetch"):
        clean_msg = "Could not fetch metadata for this link. Please verify the URL in your browser and try again."

    if "\n" in clean_msg:
        clean_msg = clean_msg.splitlines()[-1].strip()

    if len(clean_msg) > 160:
        clean_msg = clean_msg[:160] + "…"

    return MediaFetchError(
        clean_msg,
        title="Invalid Link",
        status_code=422,
    )


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
