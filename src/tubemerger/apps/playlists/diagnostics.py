"""Playlist URL diagnostics, DRM detection, and error categorization."""

import re


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

    if any(s in err_lower for s in ("video unavailable", "this video is unavailable", "this video has been removed", "does not exist")):
        return MediaFetchError(
            "This video or playlist is unavailable or has been removed from YouTube. Please check the URL.",
            title="Content Unavailable",
            status_code=404,
        )

    # 8. Age-Restricted Content
    if any(s in err_lower for s in ("sign in to confirm your age", "age-restricted", "age confirmation")):
        return MediaFetchError(
            "This video is age-restricted and requires YouTube account authentication to access.",
            title="Age-Restricted Video",
            status_code=403,
        )

    # 9. Geo-restricted / Blocked in Country
    if any(s in err_lower for s in ("not available in your country", "blocked in your country", "geographic restriction")):
        return MediaFetchError(
            "This video is geographically restricted and blocked in your country by the content owner.",
            title="Geographic Restriction",
            status_code=403,
        )

    # 10. Live Streams
    if any(s in err_lower for s in ("live event will begin", "this live stream recording is not available")):
        return MediaFetchError(
            "Live streams that are currently broadcasting cannot be merged. Please wait until the broadcast ends and YouTube processes the recording.",
            title="Active Live Stream",
            status_code=422,
        )

    # 11. YouTube Bot / Rate Limit (HTTP 429)
    if "429" in err_lower or "too many requests" in err_lower:
        return MediaFetchError(
            "YouTube has temporarily rate-limited requests from your IP address. Please wait a few minutes before trying again.",
            title="Rate Limited by YouTube",
            status_code=429,
        )

    if any(s in err_lower for s in ("sign in if you're not a bot", "bot verification", "automated queries", "prove you're not a robot")):
        return MediaFetchError(
            "YouTube has requested bot verification. Please wait a short while or open YouTube in your browser to verify your connection.",
            title="Bot Verification Required",
            status_code=429,
        )

    # 12. Invalid URL syntax
    if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
        return MediaFetchError(
            "Please paste a valid web URL starting with https:// (e.g. https://www.youtube.com/playlist?list=...)",
            title="Invalid URL Format",
            status_code=422,
        )

    # 13. Network / Connection Errors
    if any(s in err_lower for s in ("unable to download webpage", "connection refused", "name or service not known", "network is unreachable", "nodename nor servname provided")):
        return MediaFetchError(
            "Could not connect to YouTube. Please check your internet connection and verify that you can open youtube.com in your web browser.",
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
