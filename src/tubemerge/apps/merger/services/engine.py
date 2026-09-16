"""Merge Pipeline Engine orchestrator facade.

Coordinates download, normalization, stitching, and chapter embedding by delegating
to specialized domain services.
"""

import logging
import os
import subprocess
import threading
import time
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from tubemerge.apps.merger.services.downloaders.folder_downloader import FolderDownloader
from tubemerge.apps.merger.services.downloaders.merge_pipeline import MergePipeline
from tubemerge.apps.merger.services.downloaders.single_downloader import SingleDownloader
from tubemerge.apps.merger.services.format_builder import (
    get_audio_quality_flag,
    get_ytdlp_format_filter,
)
from tubemerge.apps.merger.services.normalizer import VideoNormalizerService
from tubemerge.apps.merger.services.process_manager import (
    deregister_process,
    get_active_process_registry,
    kill_all_active_processes,
    register_process,
    resume_proc_tree,
    suspend_proc_tree,
)
from tubemerge.apps.merger.services.progress_parser import parse_status_line
from tubemerge.apps.merger.services.specs import (
    MergeJobSpec,
    PipelineStatus,
    ProgressSnapshot,
)
from tubemerge.apps.merger.services.stitcher import VideoStitcherService
from tubemerge.apps.telemetry.service import (
    categorize_ytdlp_error,
    is_resolvable_error,
)
from tubemerge.core import settings
from tubemerge.utils.file_system import safe_remove_directory
from tubemerge.utils.process import get_hidden_subprocess_kwargs

logger = logging.getLogger(__name__)

# Re-export process registry and models for backward compatibility
_ACTIVE_PROCS = get_active_process_registry()
_kill_all_active_processes = kill_all_active_processes


class MergeEngine:
    """High-level facade orchestrating download, normalization, stitching, and chapter embedding."""

    # Retain static helper methods for backward compatibility
    _get_ytdlp_format_filter = staticmethod(get_ytdlp_format_filter)
    _suspend_proc_tree = staticmethod(suspend_proc_tree)
    _resume_proc_tree = staticmethod(resume_proc_tree)

    def _get_audio_quality_flag(self) -> str:
        q = str(getattr(self.job_spec, "quality", "") or getattr(self.job_spec, "audio_bitrate", ""))
        return get_audio_quality_flag(q)

    def __init__(
        self,
        job_spec: MergeJobSpec,
        ytdlp_path: str,
        ffmpeg_path: str,
        metadata_service,
        on_progress: Optional[Callable[[ProgressSnapshot], None]] = None,
    ):
        self.job_spec = job_spec
        self.ytdlp_path = ytdlp_path
        self.ffmpeg_path = ffmpeg_path
        self.metadata_service = metadata_service
        self._on_progress = on_progress

        self.is_cancelled = False
        self.is_paused = False
        self.is_running = False
        self._pause_event = threading.Event()
        self._pause_event.set()
        self._current_proc: Optional[subprocess.Popen] = None
        self._last_snapshot: Optional[ProgressSnapshot] = None

        # Delegate normalization and stitching to dedicated services
        self.normalizer_service = VideoNormalizerService(
            ffmpeg_path=ffmpeg_path,
            process_registry=_ACTIVE_PROCS,
        )
        self.stitcher_service = VideoStitcherService(ffmpeg_path=ffmpeg_path)

        # Delegate execution strategies to specialized downloaders
        self._single_downloader = SingleDownloader(
            ytdlp_path=ytdlp_path,
            ffmpeg_path=ffmpeg_path,
            run_download_fn=lambda *a, **kw: self._run_ytdlp_download(*a, **kw),
            emit_fn=self._emit,
            check_cancelled_fn=lambda: self.is_cancelled,
        )
        self._folder_downloader = FolderDownloader(
            ytdlp_path=ytdlp_path,
            ffmpeg_path=ffmpeg_path,
            run_download_fn=lambda *a, **kw: self._run_ytdlp_download(*a, **kw),
            emit_fn=self._emit,
            check_pause_fn=self._check_pause,
            check_cancelled_fn=lambda: self.is_cancelled,
        )
        self._merge_pipeline = MergePipeline(
            ytdlp_path=ytdlp_path,
            ffmpeg_path=ffmpeg_path,
            normalizer_service=self.normalizer_service,
            stitcher_service=self.stitcher_service,
            run_download_fn=lambda *a, **kw: self._run_ytdlp_download(*a, **kw),
            probe_duration_fn=lambda *a, **kw: self._probe_duration(*a, **kw),
            emit_fn=self._emit,
            check_pause_fn=self._check_pause,
            check_cancelled_fn=lambda: self.is_cancelled,
        )

    def cancel(self) -> None:
        """Cancel active job and terminate running child processes."""
        self.is_cancelled = True
        self.is_paused = False
        self._pause_event.set()
        if self._current_proc and self._current_proc.poll() is None:
            resume_proc_tree(self._current_proc)
            try:
                self._current_proc.kill()
            except Exception:
                pass

    def pause(self) -> bool:
        """Pause running download process."""
        if self.is_cancelled:
            return False
        if not self._pause_event.is_set():
            return True
        self.is_paused = True
        self._pause_event.clear()
        if self._current_proc and self._current_proc.poll() is None:
            suspend_proc_tree(self._current_proc)

        current_snap = self._last_snapshot
        self._emit(ProgressSnapshot(
            status=PipelineStatus.PAUSED,
            current_item=current_snap.current_item if current_snap else 1,
            total_items=current_snap.total_items if current_snap else 1,
            current_video_title=current_snap.current_video_title if current_snap else "",
            overall_percent=current_snap.overall_percent if current_snap else 0.0,
            message="Download paused. Click Resume to continue.",
            speed="0 KB/s",
        ))
        return True

    def resume(self) -> bool:
        """Resume paused download process."""
        if self.is_cancelled:
            return False
        if self._pause_event.is_set():
            return True
        self.is_paused = False
        self._pause_event.set()
        if self._current_proc and self._current_proc.poll() is None:
            resume_proc_tree(self._current_proc)

        current_snap = self._last_snapshot
        self._emit(ProgressSnapshot(
            status=PipelineStatus.DOWNLOADING,
            current_item=current_snap.current_item if current_snap else 1,
            total_items=current_snap.total_items if current_snap else 1,
            current_video_title=current_snap.current_video_title if current_snap else "",
            overall_percent=current_snap.overall_percent if current_snap else 0.0,
            message="Resuming download…",
            speed=None,
        ))
        return True

    def _check_pause(self) -> None:
        """Wait while pipeline is paused."""
        while not self._pause_event.is_set():
            if self.is_cancelled:
                break
            time.sleep(0.2)

    def _emit(self, snapshot: ProgressSnapshot) -> None:
        """Emit progress update to listener and cleanup queue upon completion."""
        self._last_snapshot = snapshot
        if snapshot.status == PipelineStatus.DONE:
            try:
                from tubemerge.apps.queues.services import QueueService
                QueueService.remove_by_url(self.job_spec.playlist_url)
            except Exception:
                pass
        if self._on_progress:
            try:
                self._on_progress(snapshot)
            except Exception:
                pass

    def _register_proc(self, proc: subprocess.Popen) -> None:
        register_process(proc)

    def _deregister_proc(self, proc: subprocess.Popen) -> None:
        deregister_process(proc)

    def _run_ytdlp_download(
        self,
        cmd: List[str],
        on_progress_update: Optional[Callable[[float, str], None]] = None,
        timeout: int = 1800,
    ) -> Tuple[int, str]:
        """Execute yt-dlp CLI process with line-by-line progress stream parsing."""
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            **get_hidden_subprocess_kwargs(),
        )
        self._register_proc(proc)
        self._current_proc = proc
        output_lines = []
        last_emit = 0.0

        try:
            if proc.stdout:
                for line in proc.stdout:
                    if self.is_cancelled:
                        proc.kill()
                        break
                    while not self._pause_event.is_set():
                        if self.is_cancelled:
                            proc.kill()
                            break
                        time.sleep(0.25)
                    line_str = line.strip()
                    output_lines.append(line_str)
                    if on_progress_update:
                        parsed = parse_status_line(line_str)
                        if parsed:
                            pct, spd = parsed
                            now = time.time()
                            if now - last_emit >= 0.2:
                                last_emit = now
                                on_progress_update(pct, spd)
            proc.wait(timeout=timeout)
            return proc.returncode, "\n".join(output_lines[-15:])
        finally:
            self._current_proc = None
            self._deregister_proc(proc)

    def _probe_duration(self, path: Path) -> Optional[float]:
        """Use ffprobe to determine duration of a media file."""
        try:
            ffprobe_bin = (
                self.ffmpeg_path.replace("ffmpeg", "ffprobe")
                if "ffmpeg" in self.ffmpeg_path
                else "ffprobe"
            )
            result = subprocess.run(
                [
                    ffprobe_bin,
                    "-v", "quiet",
                    "-show_entries", "format=duration",
                    "-of", "csv=p=0",
                    str(path),
                ],
                capture_output=True,
                text=True,
                timeout=30,
                **get_hidden_subprocess_kwargs(),
            )
            return float(result.stdout.strip())
        except Exception:
            return None

    def run(self) -> None:
        """Execute the merge pipeline synchronously."""
        job_id = self.job_spec.output_filename.replace(".mp4", "").replace(".mp3", "")
        temp_dir = settings.TEMP_WORKDIR / f"job_{job_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        downloads_dir = Path.home() / "Downloads"
        if not downloads_dir.exists():
            downloads_dir = settings.DEFAULT_OUTPUT_DIR
        output_dir = downloads_dir

        is_audio = getattr(self.job_spec, "media_format", "mp4").lower() == "mp3"
        default_ext = ".mp3" if is_audio else ".mp4"

        sanitized_name = "".join(
            c for c in self.job_spec.output_filename if c.isalnum() or c in "._- "
        ).strip()
        if not sanitized_name or sanitized_name in (".mp4", ".mp3"):
            sanitized_name = f"TubeMerge_{job_id}{default_ext}"
        elif is_audio and not sanitized_name.endswith(".mp3"):
            sanitized_name = f"{sanitized_name.rsplit('.', 1)[0]}.mp3"
        elif not is_audio and not sanitized_name.endswith(".mp4"):
            sanitized_name = f"{sanitized_name.rsplit('.', 1)[0]}.mp4"

        final_output_path = output_dir / sanitized_name

        try:
            # 1. Fetch metadata
            self._emit(ProgressSnapshot(
                status=PipelineStatus.FETCHING,
                overall_percent=2.0,
                message="Fetching playlist metadata…",
            ))

            playlist = self.metadata_service.fetch_playlist(self.job_spec.playlist_url)
            selected_entries = [
                playlist.entries[i]
                for i in self.job_spec.selected_indices
                if 0 <= i < len(playlist.entries)
            ]

            if not selected_entries:
                raise ValueError("No valid videos selected for merge.")

            if self.is_cancelled:
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            # Branch A: Single Item Shortcut
            if len(selected_entries) == 1:
                self._single_downloader.download(
                    clip=selected_entries[0],
                    playlist=playlist,
                    job_id=job_id,
                    is_audio=is_audio,
                    quality=self.job_spec.quality or self.job_spec.canvas_preset,
                    audio_bitrate=getattr(self.job_spec, "audio_bitrate", None),
                    downloads_dir=downloads_dir,
                    temp_dir=temp_dir,
                )
                return

            # Branch B: Unmerged Batch Download into Folder
            if not self.job_spec.merge_videos:
                self._folder_downloader.download(
                    selected_entries=selected_entries,
                    playlist=playlist,
                    job_id=job_id,
                    is_audio=is_audio,
                    quality=self.job_spec.quality or self.job_spec.canvas_preset,
                    audio_bitrate=getattr(self.job_spec, "audio_bitrate", None),
                    downloads_dir=downloads_dir,
                    temp_dir=temp_dir,
                )
                return

            # Branch C: Full Stitching Merge Pipeline
            self._merge_pipeline.execute(
                selected_entries=selected_entries,
                playlist=playlist,
                job_spec=self.job_spec,
                metadata_service=self.metadata_service,
                is_audio=is_audio,
                final_output_path=final_output_path,
                temp_dir=temp_dir,
            )

        except Exception as exc:
            safe_remove_directory(temp_dir)
            err_str = str(exc)
            err_sub = categorize_ytdlp_error(err_str)
            self._emit(ProgressSnapshot(
                status=PipelineStatus.ERROR,
                error=err_str,
                error_subtype=err_sub,
                is_resolvable=is_resolvable_error(err_sub),
                message=f"Pipeline error: {err_str}",
                playlist_size_mb=getattr(self.job_spec, "estimated_size_mb", None),
            ))

    def start(self) -> None:
        """Launch the pipeline asynchronously in a background daemon thread."""
        self.is_running = True
        t = threading.Thread(target=self._run_wrapper, daemon=True)
        t.start()

    def _run_wrapper(self) -> None:
        """Thread wrapper that guarantees clearing is_running upon completion."""
        try:
            self.run()
        finally:
            self.is_running = False
