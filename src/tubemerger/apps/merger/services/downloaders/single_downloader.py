"""Dedicated downloader strategy for direct single video/audio clips."""

import logging
import random
import time
import uuid
from pathlib import Path
from typing import Callable, Optional

from tubemerger.apps.history.services import HistoryService
from tubemerger.apps.merger.services.format_builder import build_download_command
from tubemerger.apps.merger.services.specs import PipelineStatus, ProgressSnapshot, PipelineExecutionError
from tubemerger.apps.telemetry.service import categorize_ytdlp_error, is_resolvable_error
from tubemerger.utils.file_system import safe_remove_directory

logger = logging.getLogger(__name__)


class SingleDownloader:
    """Handles direct single-clip downloads without normalization or stitching overhead."""

    def __init__(
        self,
        ytdlp_path: str,
        ffmpeg_path: str,
        run_download_fn: Callable,
        emit_fn: Callable[[ProgressSnapshot], None],
        check_cancelled_fn: Callable[[], bool],
    ):
        self.ytdlp_path = ytdlp_path
        self.ffmpeg_path = ffmpeg_path
        self._run_download = run_download_fn
        self._emit = emit_fn
        self._is_cancelled = check_cancelled_fn

    def download(
        self,
        clip,
        playlist,
        job_id: str,
        is_audio: bool,
        quality: Optional[str],
        audio_bitrate: Optional[str],
        downloads_dir: Path,
        temp_dir: Path,
    ) -> None:
        """Download a single video or audio directly into the user's Downloads directory."""
        clean_title = "".join(c for c in clip.title if c.isalnum() or c in " _-").strip()[:80]
        if not clean_title:
            clean_title = f"TubeMerger_{job_id}"

        media_type = "audio" if is_audio else "video"
        self._emit(ProgressSnapshot(
            status=PipelineStatus.DOWNLOADING,
            current_item=1,
            total_items=1,
            current_video_title=clip.title,
            overall_percent=0.0,
            message=f"Connecting to {media_type}: {clip.title}…",
        ))

        out_template = str(downloads_dir / f"{clean_title}.%(ext)s")
        dl_cmd = build_download_command(
            ytdlp_path=self.ytdlp_path,
            ffmpeg_path=self.ffmpeg_path,
            out_template=out_template,
            url=clip.url,
            is_audio=is_audio,
            quality=quality,
            audio_bitrate=audio_bitrate,
            is_batch=False,
        )

        highest_clip_pct = [0.0]
        last_speed = [None]
        last_eta = [None]

        def _on_single_progress(clip_pct: float, spd: str, eta: Optional[str] = None):
            highest_clip_pct[0] = max(highest_clip_pct[0], clip_pct)
            if spd:
                last_speed[0] = spd
            if eta:
                last_eta[0] = eta
            self._emit(ProgressSnapshot(
                status=PipelineStatus.DOWNLOADING,
                current_item=1,
                total_items=1,
                current_video_title=clip.title,
                overall_percent=round(highest_clip_pct[0], 1),
                speed=spd or last_speed[0],
                eta=eta or last_eta[0],
                message=f"Downloading: {clip.title} • {spd}" if spd else f"Downloading: {clip.title}",
            ))

        def _on_single_status(status_msg: str):
            self._emit(ProgressSnapshot(
                status=PipelineStatus.DOWNLOADING,
                current_item=1,
                total_items=1,
                current_video_title=clip.title,
                overall_percent=round(highest_clip_pct[0], 1),
                speed=last_speed[0],
                eta=last_eta[0],
                message=f"{status_msg} {clip.title}",
            ))

        rc, stderr_out = self._run_download(
            dl_cmd,
            on_progress_update=_on_single_progress,
            on_status_update=_on_single_status,
        )

        # Automatic retry with exponential backoff for resolvable transient errors
        if rc != 0 and not self._is_cancelled():
            err_subtype = categorize_ytdlp_error(stderr_out or "")
            if is_resolvable_error(err_subtype):
                for attempt in range(1, 3):
                    backoff_sec = 2.0 * attempt + random.uniform(0.5, 1.5)
                    logger.info(
                        "Resolvable transient failure for %s (%s). Retrying in %.1fs (attempt %d/2)...",
                        clip.title, err_subtype, backoff_sec, attempt
                    )
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.DOWNLOADING,
                        current_item=1,
                        total_items=1,
                        current_video_title=clip.title,
                        overall_percent=round(highest_clip_pct[0], 1),
                        message=f"Network hiccup, retrying ({attempt}/2) in {int(backoff_sec)}s…",
                    ))
                    time.sleep(backoff_sec)
                    if self._is_cancelled():
                        break
                    rc, stderr_out = self._run_download(
                        dl_cmd,
                        on_progress_update=_on_single_progress,
                        on_status_update=_on_single_status,
                    )
                    if rc == 0:
                        logger.info("Retry %d succeeded for %s!", attempt, clip.title)
                        break

        if rc != 0:
            err_msg = (stderr_out or "").strip()
            err_sub = categorize_ytdlp_error(err_msg)
            safe_remove_directory(temp_dir)
            raise PipelineExecutionError(
                f"Download failed for {clip.title} ({err_sub}): {err_msg[:200] if err_msg else 'Unknown error'}",
                error_subtype=err_sub,
                raw_error=err_msg,
            )

        target_ext = ".mp3" if is_audio else ".mp4"
        candidates = [
            p for p in downloads_dir.glob(f"{clean_title}.*")
            if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
        ]
        final_file = candidates[0] if candidates else downloads_dir / f"{clean_title}{target_ext}"

        safe_remove_directory(temp_dir)
        try:
            dur = int(clip.duration_seconds or 0)
            HistoryService.add_history_entry(
                job_id=str(uuid.uuid4()),
                playlist_title=clip.title or ("Single Audio" if is_audio else "Single Video"),
                playlist_url=clip.url,
                channel_name=playlist.channel or "YouTube Creator",
                video_count=1,
                duration_seconds=dur,
                resolution="Direct MP3" if is_audio else "Direct Download",
                output_path=str(final_file),
            )
        except Exception:
            pass

        self._emit(ProgressSnapshot(
            status=PipelineStatus.DONE,
            overall_percent=100.0,
            message=f"Downloaded {media_type}: {final_file}",
            output_file=str(final_file),
        ))
