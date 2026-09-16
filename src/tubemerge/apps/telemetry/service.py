"""Privacy-Preserving Counter Telemetry Service for TubeMerger.

Dispatches anonymous scalar event counters & buckets to Aptabase via background threads.
Error categorization and scalar bucketing are delegated to dedicated modules.
"""

import datetime
import logging
import platform
import random
import sys
import threading
import time

try:
    import httpx
except ImportError:
    httpx = None

from tubemerge.apps.telemetry.bucketing import (
    bucket_clips,
    bucket_duration,
    bucket_size,
)
from tubemerge.apps.telemetry.classifier import (
    categorize_ytdlp_error,
    is_resolvable_error,
)
from tubemerge.core import settings
from tubemerge.core.config import (
    TELEMETRY_APP_KEY,
    TELEMETRY_HOST,
    TELEMETRY_SMALL_THRESHOLD,
)

logger = logging.getLogger(__name__)

# Backward-compatible re-exports
_bucket_clips = bucket_clips
_bucket_duration = bucket_duration
_bucket_size = bucket_size

_APTABASE_ENDPOINT = f"{TELEMETRY_HOST}/api/v0/event"
_HEADERS = {
    "App-Key": TELEMETRY_APP_KEY,
    "Content-Type": "application/json",
}

# Per-process session ID: epoch + random 8 digits
_SESSION_ID = f"{int(time.time())}{random.randint(10000000, 99999999)}"

_IS_DEV = not getattr(sys, "frozen", False)

_SYSTEM_PROPS = {
    "locale": "en-US",
    "osName": platform.system(),
    "osVersion": platform.release(),
    "deviceModel": platform.machine() or "PC",
    "isDebug": getattr(settings, "DEBUG", _IS_DEV),
    "appVersion": getattr(settings, "VERSION", "1.0.1"),
    "sdkVersion": "aptabase-python@0.1.0",
}


class TelemetryService:
    """Thread-safe, fire-and-forget anonymous event counter for Aptabase."""

    categorize_ytdlp_error = staticmethod(categorize_ytdlp_error)
    is_resolvable_error = staticmethod(is_resolvable_error)
    _bucket_size = staticmethod(bucket_size)

    @staticmethod
    def _send_sync(payload: dict) -> None:
        """Synchronous HTTP POST to Aptabase, run in background thread."""
        if httpx is None:
            return
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.post(_APTABASE_ENDPOINT, headers=_HEADERS, json=payload)
                if res.status_code == 200:
                    logger.debug("Aptabase event '%s' sent successfully", payload.get("eventName"))
                else:
                    logger.debug("Aptabase returned status %s: %s", res.status_code, res.text)
        except Exception as exc:
            logger.debug("Telemetry send failed (non-critical): %s", exc)

    @classmethod
    def _dispatch(cls, event_name: str, props: dict | None = None) -> None:
        """Dispatch event in a daemon thread so it never blocks any thread or loop."""
        if not TELEMETRY_APP_KEY:
            return

        payload = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            "sessionId": _SESSION_ID,
            "eventName": event_name,
            "systemProps": _SYSTEM_PROPS,
            "props": props or {},
        }

        # Run completely decoupled in a daemon thread
        threading.Thread(target=cls._send_sync, args=(payload,), daemon=True).start()

    @classmethod
    async def _send(cls, event_name: str, props: dict | None = None) -> None:
        """Async compatibility wrapper."""
        cls._dispatch(event_name, props)

    @classmethod
    def track_app_launch(cls) -> None:
        """Call once when the desktop application boots up."""
        cls._dispatch("app_started")

    @classmethod
    def track_playlist_inspected(
        cls,
        clip_count: int,
        playlist_size_mb: float | None = None,
    ) -> None:
        """Call when a playlist URL is fetched and parsed."""
        props: dict = {
            "clip_count_bucket": bucket_clips(clip_count),
            "clip_count": clip_count,
        }
        if playlist_size_mb is not None:
            props["playlist_size_mb"] = round(playlist_size_mb, 1)
            props["playlist_size_bucket"] = bucket_size(playlist_size_mb)
        cls._dispatch("playlist_inspected", props=props)

    @classmethod
    def track_job_triggered(
        cls,
        clip_count: int,
        preset: str = "auto",
        playlist_size_mb: float | None = None,
    ) -> None:
        """Call when a playlist merge job is initiated."""
        props: dict = {
            "clip_count_bucket": bucket_clips(clip_count),
            "clip_count": clip_count,
            "preset": preset,
        }
        if playlist_size_mb is not None:
            props["playlist_size_mb"] = round(playlist_size_mb, 1)
            props["playlist_size_bucket"] = bucket_size(playlist_size_mb)
        cls._dispatch("playlist_merge_started", props=props)

    @classmethod
    def track_job_completed(cls, duration_seconds: float | None = None, clip_count: int | None = None) -> None:
        """Call when a playlist merge job finishes rendering."""
        props = {}
        if duration_seconds is not None:
            props["duration_bucket"] = bucket_duration(duration_seconds)
            props["duration_seconds"] = int(duration_seconds)
        if clip_count is not None:
            props["clip_count"] = clip_count
            props["clip_count_bucket"] = bucket_clips(clip_count)
        cls._dispatch("playlist_merge_completed", props=props)

    @classmethod
    def track_job_failed(
        cls,
        error_type: str = "general_error",
        error_subtype: str | None = None,
        clip_count: int | None = None,
        selected_preset: str | None = None,
        playlist_size_mb: float | None = None,
    ) -> None:
        """Call when a playlist merge job fails."""
        props: dict = {
            "error_type": error_type,
            "error_subtype": error_subtype or "unknown",
        }
        if clip_count is not None:
            props["clip_count"] = clip_count
            props["clip_count_bucket"] = bucket_clips(clip_count)
        if selected_preset:
            props["selected_preset"] = selected_preset
        if playlist_size_mb is not None:
            props["playlist_size_mb"] = round(playlist_size_mb, 1)
            props["playlist_size_bucket"] = bucket_size(playlist_size_mb)
        cls._dispatch("playlist_merge_failed", props=props)

    @classmethod
    def track_job_cancelled(cls) -> None:
        """Call when an active merge job is cancelled by the user."""
        cls._dispatch("playlist_merge_cancelled")

    @classmethod
    def track_custom_event(cls, event_name: str, props: dict | None = None) -> None:
        """Dispatch arbitrary anonymous telemetry event (e.g. from frontend issue reporting)."""
        cls._dispatch(event_name, props=props)
