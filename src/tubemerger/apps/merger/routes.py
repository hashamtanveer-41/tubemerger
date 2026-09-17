"""Merger API Routes — Playlist stitch entry point.

Key behaviors:
  - Every merge request gets a UUID4 session_id for tracking.
  - Heavy pipeline work is dispatched via FastAPI BackgroundTasks so the HTTP
    response is returned immediately (non-blocking).
  - When MONETIZATION_ACTIVE is True, the system default browser is opened to
    the ad-supported processing page. The app listens on /api/progress (SSE)
    for the completion heartbeat.
  - When MONETIZATION_ACTIVE is False (default), progress streams natively
    inside the React UI via the /api/progress SSE endpoint.
"""

import uuid
import webbrowser
import logging
from typing import Optional

from fastapi import APIRouter, Header, BackgroundTasks
from fastapi.responses import StreamingResponse

from tubemerger.core.config import MONETIZATION_ACTIVE, PRODUCTION_WEB_URL
from tubemerger.apps.merger.controllers import MergeController
from tubemerger.apps.merger.schemas import (
    StartMergeRequest,
    StartMergeResponse,
    CancelResponse,
    PauseResponse,
    ResumeResponse,
)
from tubemerger.apps.telemetry.service import TelemetryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["merger"])
controller = MergeController()


@router.post("/start-merge", response_model=StartMergeResponse)
async def start_merge(
    payload: StartMergeRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """Kick off a playlist merge job.

    Returns immediately with a session_id. Progress is streamed via GET /api/progress.
    If MONETIZATION_ACTIVE is True, also opens the browser to the ad-supported wait page.
    """
    session_id = str(uuid.uuid4())
    clip_count = len(payload.selected_indices) if hasattr(payload, "selected_indices") else 0

    # ── Fire anonymous telemetry (no URL, no metadata) ──────────────────────
    background_tasks.add_task(
        TelemetryService.track_job_triggered,
        clip_count=clip_count,
        preset="separate_videos" if payload.merge_videos is False else (payload.canvas_preset or "auto"),
        playlist_size_mb=payload.estimated_size_mb,
    )

    # ── Monetization: open browser to ad-supported wait page ─────────────────
    if MONETIZATION_ACTIVE:
        browser_url = f"{PRODUCTION_WEB_URL}?id={session_id}&status=processing"
        try:
            webbrowser.open(browser_url, new=2, autoraise=False)
            logger.info("Opened ad-supported processing page: %s", browser_url)
        except Exception as exc:
            logger.warning("Failed to open browser: %s", exc)

    # ── Dispatch pipeline to background (non-blocking response) ─────────────
    background_tasks.add_task(
        _run_merge_background,
        payload=payload,
        session_id=session_id,
    )

    return StartMergeResponse(
        job_id=session_id,
        status="started",
        message=(
            "Browser opened for ad-supported processing. "
            "Listening for completion on /api/progress."
            if MONETIZATION_ACTIVE
            else "Merge started. Stream progress via GET /api/progress."
        ),
        browser_opened=MONETIZATION_ACTIVE,
    )


async def _run_merge_background(payload: StartMergeRequest, session_id: str) -> None:
    """Background task wrapper — runs the blocking MergeController in-thread."""
    try:
        await controller.start_merge(payload, authorization=None, session_id=session_id)
    except Exception as exc:
        logger.error("Background merge error [session=%s]: %s", session_id, exc)


@router.get("/progress")
async def stream_progress():
    """Server-Sent Events stream — emits ProgressSnapshot JSON lines until DONE/ERROR."""
    return await controller.stream_progress()


@router.post("/cancel", response_model=CancelResponse)
def cancel_merge():
    """Cancel the currently running merge and SIGKILL all child processes."""
    return controller.cancel_merge()


@router.post("/pause", response_model=PauseResponse)
def pause_merge():
    """Pause active download/merge subprocess and thread."""
    return controller.pause_merge()


@router.post("/resume", response_model=ResumeResponse)
def resume_merge():
    """Resume active download/merge subprocess and thread."""
    return controller.resume_merge()

