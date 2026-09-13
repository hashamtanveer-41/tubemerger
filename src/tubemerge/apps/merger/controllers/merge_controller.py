"""Merge Controller — orchestrates start, SSE progress streaming, and cancellation.

FOSS refactor: all quota enforcement, license checks, hardware fingerprinting,
and billable-request telemetry removed. Unlimited merges for all users.
Anonymous Aptabase telemetry tracks completion counters and error rates.
"""

import asyncio
import json
import time
import uuid
from typing import Optional, List

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from tubemerge.apps.binaries.services import BinaryService
from tubemerge.apps.playlists.services import PlaylistMetadataService
from tubemerge.apps.merger.models import ProgressSnapshot, PipelineStatus
from tubemerge.apps.merger.schemas import (
    StartMergeRequest,
    StartMergeResponse,
    CancelResponse,
    PauseResponse,
    ResumeResponse,
)
from tubemerge.apps.merger.services.engine import MergeEngine, MergeJobSpec
from tubemerge.apps.telemetry.service import TelemetryService


class MergeController:
    def __init__(self):
        self.binary_service = BinaryService()
        self.active_engine: Optional[MergeEngine] = None
        self.progress_queues: List[asyncio.Queue] = []

    async def start_merge(
        self,
        payload: StartMergeRequest,
        authorization: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> StartMergeResponse:
        """Start a merge job without license, quota, or hardware restrictions."""
        if self.active_engine and getattr(self.active_engine, "is_running", False):
            raise HTTPException(
                status_code=409,
                detail={"error": "A merge job is already running."},
            )

        # Resolve installed binaries
        try:
            ffmpeg_p = self.binary_service.get_ffmpeg_path()
            ytdlp_p = self.binary_service.get_ytdlp_path()
        except (FileNotFoundError, AttributeError) as exc:
            raise HTTPException(status_code=503, detail={"error": str(exc)})

        job_id = session_id or uuid.uuid4().hex[:8]
        start_time = time.time()

        selected_quality = payload.quality or (payload.canvas_preset if payload.canvas_preset != "auto" else "1080p")
        canvas = payload.canvas_preset or "auto"
        media_fmt = (payload.format or "mp4").lower().strip()
        default_ext = ".mp3" if media_fmt == "mp3" else ".mp4"
        job_spec = MergeJobSpec(
            playlist_url=payload.url,
            selected_indices=payload.selected_indices,
            output_filename=payload.output_filename or f"TubeMerge_{job_id}{default_ext}",
            canvas_preset=canvas,
            quality=selected_quality,
            crf=payload.crf or 21,
            merge_videos=payload.merge_videos if payload.merge_videos is not None else True,
            media_format=media_fmt,
        )

        # Build metadata service (needs ytdlp path)
        metadata_service = PlaylistMetadataService(ytdlp_path=ytdlp_p)

        loop = asyncio.get_running_loop()

        def on_progress(snapshot: ProgressSnapshot):
            for q in list(self.progress_queues):
                loop.call_soon_threadsafe(q.put_nowait, snapshot)
            if snapshot.status in (
                PipelineStatus.DONE, PipelineStatus.ERROR, PipelineStatus.CANCELLED
            ):
                self.active_engine = None
                if snapshot.status == PipelineStatus.DONE:
                    duration = time.time() - start_time
                    clip_cnt = len(job_spec.selected_indices) if job_spec.selected_indices else None
                    TelemetryService.track_job_completed(duration_seconds=duration, clip_count=clip_cnt)
                elif snapshot.status == PipelineStatus.ERROR:
                    err_msg = str(snapshot.error or snapshot.message or "")
                    err_type = (
                        "ffmpeg_error" if "ffmpeg" in err_msg.lower()
                        else ("ytdlp_error" if "ytdlp" in err_msg.lower() or "download" in err_msg.lower()
                              else "pipeline_error")
                    )
                    TelemetryService.track_job_failed(error_type=err_type)
                elif snapshot.status == PipelineStatus.CANCELLED:
                    TelemetryService.track_job_cancelled()

        self.active_engine = MergeEngine(
            job_spec=job_spec,
            ytdlp_path=ytdlp_p,
            ffmpeg_path=ffmpeg_p,
            metadata_service=metadata_service,
            on_progress=on_progress,
        )
        self.active_engine.start()

        return StartMergeResponse(status="started", job_id=job_id)

    async def stream_progress(self) -> StreamingResponse:
        """SSE endpoint — emits ProgressSnapshot JSON until terminal state."""
        q: asyncio.Queue = asyncio.Queue()
        self.progress_queues.append(q)

        # Immediately dispatch current snapshot to the new subscriber so UI receives state instantly
        if self.active_engine and getattr(self.active_engine, "_last_snapshot", None):
            try:
                q.put_nowait(self.active_engine._last_snapshot)
            except Exception:
                pass

        async def event_generator():
            try:
                while True:
                    try:
                        snapshot: ProgressSnapshot = await asyncio.wait_for(q.get(), timeout=15.0)
                        data = {
                            "status": snapshot.status.value
                                if hasattr(snapshot.status, "value") else snapshot.status,
                            "current_item": snapshot.current_item,
                            "total_items": snapshot.total_items,
                            "current_video_title": snapshot.current_video_title,
                            "overall_percent": round(snapshot.overall_percent, 1),
                            "message": snapshot.message,
                            "speed": getattr(snapshot, "speed", None),
                            "output_file": snapshot.output_file,
                            "error": snapshot.error,
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                        terminal = (
                            PipelineStatus.DONE, PipelineStatus.ERROR, PipelineStatus.CANCELLED
                        )
                        if snapshot.status in terminal:
                            break
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
            finally:
                if q in self.progress_queues:
                    self.progress_queues.remove(q)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    def cancel_merge(self) -> CancelResponse:
        if self.active_engine:
            self.active_engine.cancel()
            TelemetryService.track_job_cancelled()
            return CancelResponse(status="cancelling", message="Cancellation token dispatched.")
        return CancelResponse(status="idle", message="No active job found.")

    def pause_merge(self) -> PauseResponse:
        if self.active_engine and getattr(self.active_engine, "is_running", False):
            ok = self.active_engine.pause()
            if ok:
                return PauseResponse(status="paused", message="Download paused.")
            if getattr(self.active_engine, "is_paused", False):
                return PauseResponse(status="paused", message="Download is already paused.")
        return PauseResponse(status="idle", message="No active job to pause.")

    def resume_merge(self) -> ResumeResponse:
        if self.active_engine and getattr(self.active_engine, "is_running", False):
            ok = self.active_engine.resume()
            if ok:
                return ResumeResponse(status="resumed", message="Download resumed.")
            if not getattr(self.active_engine, "is_paused", False):
                return ResumeResponse(status="resumed", message="Download is already running.")
        return ResumeResponse(status="idle", message="No active job to resume.")

