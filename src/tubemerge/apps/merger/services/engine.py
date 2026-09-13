"""Merge Pipeline Engine — Download → Normalize → Stitch → Embed Chapters.

Key design decisions for FOSS architecture:
  - All subprocess handles are registered in a shared _ACTIVE_PROCS list.
  - A process guard (registered via atexit + signal) issues SIGKILL to every
    active handle when the desktop window closes or the process crashes,
    preventing lingering zombie yt-dlp / ffmpeg tasks.
  - No license checks. No capability gates. Everything is unrestricted.
"""

import atexit
import os
import signal
import sys
import subprocess
_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
import threading
import logging
import time
from enum import Enum
from pathlib import Path
from typing import List, Optional, Callable, Tuple
from dataclasses import dataclass, field

from tubemerge.core import settings
from tubemerge.utils.file_system import safe_remove_directory
from tubemerge.utils.process import get_hidden_subprocess_kwargs
from tubemerge.apps.merger.services.normalizer import VideoNormalizerService
from tubemerge.apps.merger.services.stitcher import VideoStitcherService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global process registry — shared across all MergeEngine instances
# ---------------------------------------------------------------------------
_ACTIVE_PROCS: List[subprocess.Popen] = []
_REGISTRY_LOCK = threading.Lock()


def _kill_all_active_processes() -> None:
    """Force-kill every registered subprocess. Called on app exit / crash."""
    with _REGISTRY_LOCK:
        for proc in list(_ACTIVE_PROCS):
            try:
                if proc.poll() is None:
                    logger.warning("Sending SIGKILL to PID %s on exit.", proc.pid)
                    proc.kill()  # SIGKILL — immediate, no SIGTERM grace period
            except Exception as exc:
                logger.debug("Kill failed for proc: %s", exc)
        _ACTIVE_PROCS.clear()


def _signal_handler(signum, frame) -> None:
    _kill_all_active_processes()


# Register cleanup on every possible exit path
atexit.register(_kill_all_active_processes)
for _sig in (signal.SIGTERM, signal.SIGINT):
    try:
        signal.signal(_sig, _signal_handler)
    except (OSError, ValueError):
        pass  # Some signals can't be caught in non-main threads


# ---------------------------------------------------------------------------
# Pipeline state machine
# ---------------------------------------------------------------------------
class PipelineStatus(str, Enum):
    IDLE = "idle"
    FETCHING = "fetching"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    NORMALIZING = "normalizing"
    STITCHING = "stitching"
    EMBEDDING_CHAPTERS = "embedding_chapters"
    DONE = "done"
    CANCELLED = "cancelled"
    ERROR = "error"


@dataclass
class MergeJobSpec:
    playlist_url: str
    selected_indices: List[int]
    output_filename: str = "merged_output.mp4"
    canvas_preset: str = "auto"
    quality: str = "1080p"
    crf: int = settings.DEFAULT_CRF
    merge_videos: bool = True
    media_format: str = "mp4"


@dataclass
class ProgressSnapshot:
    status: PipelineStatus = PipelineStatus.IDLE
    overall_percent: float = 0.0
    current_item: int = 0
    total_items: int = 0
    current_video_title: str = ""
    message: str = ""
    speed: Optional[str] = None
    output_file: Optional[str] = None
    error: Optional[str] = None


class MergeEngine:
    """Orchestrates the full download → normalize → stitch → chapter-embed pipeline."""

    @staticmethod
    def _get_ytdlp_format_filter(quality: str) -> str:
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

    def _get_audio_quality_flag(self) -> str:
        q = str(getattr(self.job_spec, "quality", "") or getattr(self.job_spec, "audio_bitrate", "")).lower().strip()
        if "320" in q:
            return "320k"
        elif "256" in q:
            return "256k"
        elif "192" in q:
            return "192k"
        elif "128" in q:
            return "128k"
        return "0"


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
        self._pause_event = threading.Event()
        self._pause_event.set()
        self._current_proc: Optional[subprocess.Popen] = None
        self._last_snapshot: Optional[ProgressSnapshot] = None

        # Services share the global process registry so guards catch their subprocesses
        self.normalizer_service = VideoNormalizerService(
            ffmpeg_path=ffmpeg_path,
            process_registry=_ACTIVE_PROCS,
        )
        self.stitcher_service = VideoStitcherService(ffmpeg_path=ffmpeg_path)

    def cancel(self) -> None:
        self.is_cancelled = True
        self.is_paused = False
        self._pause_event.set()  # Unblock thread if paused so it can terminate cleanly
        if self._current_proc and self._current_proc.poll() is None:
            self._resume_proc_tree(self._current_proc)
            try:
                self._current_proc.kill()
            except Exception:
                pass

    @staticmethod
    def _suspend_proc_tree(proc: Optional[subprocess.Popen]) -> None:
        if not proc or proc.poll() is not None:
            return
        try:
            import psutil
            p = psutil.Process(proc.pid)
            for child in p.children(recursive=True):
                try:
                    child.suspend()
                except Exception:
                    pass
            p.suspend()
        except Exception:
            try:
                if sys.platform != "win32":
                    os.kill(proc.pid, signal.SIGSTOP)
            except Exception:
                pass

    @staticmethod
    def _resume_proc_tree(proc: Optional[subprocess.Popen]) -> None:
        if not proc or proc.poll() is not None:
            return
        try:
            import psutil
            p = psutil.Process(proc.pid)
            p.resume()
            for child in p.children(recursive=True):
                try:
                    child.resume()
                except Exception:
                    pass
        except Exception:
            try:
                if sys.platform != "win32":
                    os.kill(proc.pid, signal.SIGCONT)
            except Exception:
                pass

    def _check_pause(self) -> None:
        """Helper to block execution loop while pipeline is paused."""
        while not self._pause_event.is_set():
            if self.is_cancelled:
                break
            time.sleep(0.2)

    def pause(self) -> bool:
        if self.is_cancelled:
            return False
        if not self._pause_event.is_set():
            return True  # Idempotent: already paused
        self.is_paused = True
        self._pause_event.clear()
        if self._current_proc and self._current_proc.poll() is None:
            self._suspend_proc_tree(self._current_proc)

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
        if self.is_cancelled:
            return False
        if self._pause_event.is_set():
            return True  # Idempotent: already running
        self.is_paused = False
        self._pause_event.set()
        if self._current_proc and self._current_proc.poll() is None:
            self._resume_proc_tree(self._current_proc)

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

    def _emit(self, snapshot: ProgressSnapshot) -> None:
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
        with _REGISTRY_LOCK:
            _ACTIVE_PROCS.append(proc)

    def _deregister_proc(self, proc: subprocess.Popen) -> None:
        with _REGISTRY_LOCK:
            try:
                _ACTIVE_PROCS.remove(proc)
            except ValueError:
                pass

    def _run_ytdlp_download(
        self,
        cmd: List[str],
        on_progress_update: Optional[Callable[[float, str], None]] = None,
        timeout: int = 1800,
    ) -> Tuple[int, str]:
        """Runs yt-dlp with line-by-line progress and speed extraction."""
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
                    if "STATUS|" in line_str and on_progress_update:
                        try:
                            parts = line_str[line_str.find("STATUS|"):].split("|")
                            if len(parts) >= 3:
                                try:
                                    pct = float(parts[1].replace("%", "").strip())
                                except ValueError:
                                    pct = 0.0
                                raw_spd = parts[2].strip()
                                spd = raw_spd.replace("i", "") if raw_spd and "Unknown" not in raw_spd else ""
                                now = time.time()
                                if now - last_emit >= 0.2:
                                    last_emit = now
                                    on_progress_update(pct, spd)
                        except Exception:
                            pass
            proc.wait(timeout=timeout)
            return proc.returncode, "\n".join(output_lines[-15:])
        finally:
            self._current_proc = None
            self._deregister_proc(proc)

    def _probe_duration(self, path: Path) -> Optional[float]:
        try:
            result = subprocess.run(
                [
                    self.ffmpeg_path.replace("ffmpeg", "ffprobe")
                    if "ffmpeg" in self.ffmpeg_path
                    else "ffprobe",
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
        """Execute the full merge pipeline synchronously (call from a background thread)."""
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
            # ── 1. Fetch metadata ────────────────────────────────────────────
            self._emit(ProgressSnapshot(
                status=PipelineStatus.FETCHING,
                overall_percent=2.0,
                message=f"Fetching playlist metadata…",
            ))

            playlist = self.metadata_service.fetch_playlist(self.job_spec.playlist_url)
            selected_entries = [
                playlist.entries[i] for i in self.job_spec.selected_indices
                if 0 <= i < len(playlist.entries)
            ]

            if not selected_entries:
                raise ValueError("No valid videos selected for merge.")

            if self.is_cancelled:
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            # ── Single Item Shortcut: If only 1 item selected, skip merge and download directly ──
            if len(selected_entries) == 1:
                clip = selected_entries[0]
                clean_title = "".join(c for c in clip.title if c.isalnum() or c in " _-").strip()
                if not clean_title:
                    clean_title = f"TubeMerge_{job_id}"

                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=1,
                    total_items=1,
                    current_video_title=clip.title,
                    overall_percent=15.0,
                    message=f"Downloading {'audio' if is_audio else 'video'}: {clip.title}",
                ))

                out_template = str(downloads_dir / f"{clean_title}.%(ext)s")
                if is_audio:
                    dl_cmd = [
                        self.ytdlp_path,
                        "--ffmpeg-location", self.ffmpeg_path,
                        "-x",
                        "--audio-format", "mp3",
                        "--audio-quality", self._get_audio_quality_flag(),
                        "-o", out_template,
                        "--no-playlist",
                        "--no-warnings",
                        "--newline",
                        "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                        clip.url,
                    ]
                else:
                    dl_cmd = [
                        self.ytdlp_path,
                        "--ffmpeg-location", self.ffmpeg_path,
                        "-f", self._get_ytdlp_format_filter(self.job_spec.quality or self.job_spec.canvas_preset),
                        "-o", out_template,
                        "--no-playlist",
                        "--no-warnings",
                        "--newline",
                        "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                        clip.url,
                    ]

                def _single_progress(clip_pct: float, spd: str):
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.DOWNLOADING,
                        current_item=1,
                        total_items=1,
                        current_video_title=clip.title,
                        overall_percent=round(clip_pct, 1),
                        speed=spd or None,
                        message=f"Downloading: {clip.title} • {spd}" if spd else f"Downloading: {clip.title}",
                    ))

                rc, stderr_out = self._run_ytdlp_download(dl_cmd, on_progress_update=_single_progress)
                if rc != 0:
                    err_msg = (stderr_out or "").strip()
                    safe_remove_directory(temp_dir)
                    raise RuntimeError(f"Download failed for {clip.title}: {err_msg[:250] if err_msg else 'Unknown error'}")

                target_ext = ".mp3" if is_audio else ".mp4"
                candidates = [
                    p for p in downloads_dir.glob(f"{clean_title}.*")
                    if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
                ]
                final_file = candidates[0] if candidates else downloads_dir / f"{clean_title}{target_ext}"

                safe_remove_directory(temp_dir)
                try:
                    import uuid as _uuid
                    from tubemerge.apps.history.services import HistoryService
                    dur = int(clip.duration_seconds or 0)
                    HistoryService.add_history_entry(
                        job_id=str(_uuid.uuid4()),
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
                    message=f"Downloaded {'audio' if is_audio else 'video'}: {final_file}",
                    output_file=str(final_file),
                ))
                return

            # ── Mode B: Individual Files (Single by single in dedicated folder) ──
            if not self.job_spec.merge_videos:
                clean_playlist_title = "".join(
                    c for c in (playlist.title or "Playlist") if c.isalnum() or c in " _-"
                ).strip()
                folder_prefix = "TubeMerger (Audio)" if is_audio else "TubeMerger"
                folder_name = f"{folder_prefix} - {clean_playlist_title}" if clean_playlist_title else f"{folder_prefix}_Playlist_{job_id}"
                target_folder = downloads_dir / folder_name
                target_folder.mkdir(parents=True, exist_ok=True)

                total_videos = len(selected_entries)
                downloaded_files = []
                durations = []
                last_folder_err = ""

                for idx, clip in enumerate(selected_entries, start=1):
                    self._check_pause()
                    if self.is_cancelled:
                        self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                        return

                    pct = (idx / total_videos) * 98.0
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.DOWNLOADING,
                        current_item=idx,
                        total_items=total_videos,
                        current_video_title=clip.title,
                        overall_percent=pct,
                        message=f"Downloading ({idx}/{total_videos}): {clip.title}",
                    ))

                    clean_clip_title = "".join(
                        c for c in clip.title if c.isalnum() or c in " _-"
                    ).strip()
                    if not clean_clip_title:
                        clean_clip_title = f"track_{idx:02d}" if is_audio else f"video_{idx:02d}"

                    out_template = str(target_folder / f"{idx:02d} - {clean_clip_title}.%(ext)s")
                    if is_audio:
                        dl_cmd = [
                            self.ytdlp_path,
                            "--ffmpeg-location", self.ffmpeg_path,
                            "-x",
                            "--audio-format", "mp3",
                            "--audio-quality", self._get_audio_quality_flag(),
                            "-o", out_template,
                            "--no-playlist",
                            "--no-warnings",
                            "--newline",
                            "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                            clip.url,
                        ]
                    else:
                        dl_cmd = [
                            self.ytdlp_path,
                            "--ffmpeg-location", self.ffmpeg_path,
                            "-f", self._get_ytdlp_format_filter(self.job_spec.quality or self.job_spec.canvas_preset),
                            "-o", out_template,
                            "--no-playlist",
                            "--no-warnings",
                            "--newline",
                            "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                            clip.url,
                        ]

                    def _folder_progress(clip_pct: float, spd: str):
                        overall = ((idx - 1 + (clip_pct / 100.0)) / total_videos) * 98.0
                        self._emit(ProgressSnapshot(
                            status=PipelineStatus.DOWNLOADING,
                            current_item=idx,
                            total_items=total_videos,
                            current_video_title=clip.title,
                            overall_percent=round(overall, 1),
                            speed=spd or None,
                            message=f"Downloading ({idx}/{total_videos}): {clip.title} • {spd}" if spd else f"Downloading ({idx}/{total_videos}): {clip.title}",
                        ))

                    rc, stderr_out = self._run_ytdlp_download(dl_cmd, on_progress_update=_folder_progress)

                    if rc != 0:
                        last_folder_err = (stderr_out or "").strip()
                        logger.warning("Download failed for %s: %s", clip.title, last_folder_err[:200])
                        continue

                    candidates = [
                        p for p in target_folder.glob(f"{idx:02d} - {clean_clip_title}.*")
                        if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
                    ]
                    if candidates:
                        downloaded_files.append(candidates[0])
                        durations.append(float(clip.duration_seconds or 0))

                if not downloaded_files:
                    err_suffix = f": {last_folder_err[:250]}" if last_folder_err else ""
                    raise RuntimeError(f"No files were successfully downloaded into folder{err_suffix}.")

                safe_remove_directory(temp_dir)
                try:
                    import uuid as _uuid
                    from tubemerge.apps.history.services import HistoryService
                    total_dur = int(sum(durations))
                    HistoryService.add_history_entry(
                        job_id=str(_uuid.uuid4()),
                        playlist_title=playlist.title or ("Playlist (Individual MP3s)" if is_audio else "Playlist (Individual Videos)"),
                        playlist_url=self.job_spec.playlist_url,
                        channel_name=playlist.channel or "YouTube Creator",
                        video_count=len(downloaded_files),
                        duration_seconds=total_dur,
                        resolution="Individual MP3s" if is_audio else "Individual Videos",
                        output_path=str(target_folder),
                    )
                except Exception:
                    pass

                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DONE,
                    overall_percent=100.0,
                    message=f"Downloaded {len(downloaded_files)} files to: {target_folder}",
                    output_file=str(target_folder),
                ))
                return

            # ── 2. Canvas determination (for video) ─────────────────────────
            canvas_key = self.job_spec.quality or self.job_spec.canvas_preset
            preset = settings.CANVAS_PRESETS.get(canvas_key, settings.CANVAS_PRESETS.get("1080p", settings.CANVAS_PRESETS["auto"]))
            target_w, target_h, target_fps = preset["width"], preset["height"], preset["fps"]

            if not is_audio and canvas_key == "auto" and selected_entries[0].url:
                pw, ph, pfps = self.metadata_service.probe_canvas(selected_entries[0].url)
                target_w, target_h, target_fps = pw, ph, pfps

            total_videos = len(selected_entries)
            raw_files = []
            last_merge_err = ""

            # ── 3. Download phase ────────────────────────────────────────────
            for idx, clip in enumerate(selected_entries, start=1):
                self._check_pause()
                if self.is_cancelled:
                    self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                    return

                pct = 5.0 + (idx / total_videos) * 40.0
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=pct,
                    message=f"Downloading ({idx}/{total_videos}): {clip.title}",
                ))

                out_template = str(temp_dir / f"raw_{idx:04d}.%(ext)s")
                if is_audio:
                    dl_cmd = [
                        self.ytdlp_path,
                        "--ffmpeg-location", self.ffmpeg_path,
                        "-x",
                        "--audio-format", "mp3",
                        "--audio-quality", self._get_audio_quality_flag(),
                        "-o", out_template,
                        "--no-playlist",
                        "--no-warnings",
                        "--newline",
                        "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                        clip.url,
                    ]
                else:
                    dl_cmd = [
                        self.ytdlp_path,
                        "--ffmpeg-location", self.ffmpeg_path,
                        "-f", self._get_ytdlp_format_filter(self.job_spec.quality or self.job_spec.canvas_preset),
                        "-o", out_template,
                        "--no-playlist",
                        "--no-warnings",
                        "--newline",
                        "--progress-template", "download:STATUS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
                        clip.url,
                    ]

                def _merge_dl_progress(clip_pct: float, spd: str):
                    overall = 5.0 + (((idx - 1 + (clip_pct / 100.0)) / total_videos) * 40.0)
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.DOWNLOADING,
                        current_item=idx,
                        total_items=total_videos,
                        current_video_title=clip.title,
                        overall_percent=round(overall, 1),
                        speed=spd or None,
                        message=f"Downloading ({idx}/{total_videos}): {clip.title} • {spd}" if spd else f"Downloading ({idx}/{total_videos}): {clip.title}",
                    ))

                rc, stderr_out = self._run_ytdlp_download(dl_cmd, on_progress_update=_merge_dl_progress)

                if rc != 0:
                    last_merge_err = (stderr_out or "").strip()
                    logger.warning("Download failed for %s: %s", clip.title, last_merge_err[:200])
                    continue

                candidates = [
                    p for p in temp_dir.glob(f"raw_{idx:04d}.*")
                    if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
                ]
                if candidates:
                    raw_files.append((clip, candidates[0]))

            if not raw_files:
                err_suffix = f": {last_merge_err[:250]}" if last_merge_err else ""
                raise RuntimeError(f"No files were successfully downloaded{err_suffix}; nothing to merge.")

            # ── 4. Normalization phase ───────────────────────────────────────
            normalized_files: List[Path] = []
            durations: List[float] = []
            titles_success: List[str] = []

            if is_audio:
                # Audio concatenation bypasses video normalization
                normalized_files = [p for _, p in raw_files]
                durations = [self._probe_duration(p) or float(c.duration_seconds or 180.0) for c, p in raw_files]
                titles_success = [c.title for c, _ in raw_files]
            else:
                for idx, (clip, raw_path) in enumerate(raw_files, start=1):
                    if self.is_cancelled:
                        self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                        return

                    pct = 45.0 + (idx / len(raw_files)) * 35.0
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.NORMALIZING,
                        current_item=idx,
                        total_items=len(raw_files),
                        current_video_title=clip.title,
                        overall_percent=pct,
                        message=f"Normalising ({idx}/{len(raw_files)}): {clip.title}",
                    ))

                    norm_path = temp_dir / f"norm_{idx:04d}.mp4"
                    success = self.normalizer_service.normalize(
                        input_path=raw_path,
                        output_path=norm_path,
                        target_w=target_w,
                        target_h=target_h,
                        fps=target_fps,
                        crf=self.job_spec.crf,
                    )

                    # Progressive disk cleanup — delete raw immediately after normalization
                    raw_path.unlink(missing_ok=True)

                    if success:
                        normalized_files.append(norm_path)
                        dur = self._probe_duration(norm_path) or float(clip.duration_seconds or 1.0)
                        durations.append(dur)
                        titles_success.append(clip.title)

                if not normalized_files:
                    raise RuntimeError("Normalization failed for all video segments.")

            # ── 5. Stitching phase ───────────────────────────────────────────
            if self.is_cancelled:
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            self._emit(ProgressSnapshot(
                status=PipelineStatus.STITCHING,
                overall_percent=82.0,
                message=f"Stitching segments into final {'audio' if is_audio else 'video'}…",
            ))

            manifest_path = temp_dir / "manifest.txt"
            self.stitcher_service.write_manifest(normalized_files, manifest_path)
            stitch_ok = self.stitcher_service.stitch_segments(manifest_path, final_output_path, is_audio=is_audio)

            if not stitch_ok:
                raise RuntimeError("FFmpeg concat demuxer failed to merge segments.")

            # ── 6. Chapter embedding (for video) ────────────────────────────
            if not is_audio:
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.EMBEDDING_CHAPTERS,
                    overall_percent=90.0,
                    message="Embedding chapter markers…",
                ))

                metadata_content = self.stitcher_service.build_chapter_metadata(titles_success, durations)
                meta_path = temp_dir / "chapters.txt"
                meta_path.write_text(metadata_content, encoding="utf-8")
                self.stitcher_service.embed_chapters(final_output_path, meta_path)

            # ── 7. Persist history ───────────────────────────────────────────
            safe_remove_directory(temp_dir)
            try:
                import uuid as _uuid
                from tubemerge.apps.history.services import HistoryService
                total_dur = int(sum(durations))
                res_str = "Merged MP3" if is_audio else (
                    f"{target_h}p" if target_h <= 1080
                    else ("4K 60FPS" if target_h <= 2160 else "8K")
                )
                HistoryService.add_history_entry(
                    job_id=str(_uuid.uuid4()),
                    playlist_title=playlist.title or ("Merged Playlist (Audio)" if is_audio else "Merged Playlist"),
                    playlist_url=self.job_spec.playlist_url,
                    channel_name=playlist.channel or "YouTube Creator",
                    video_count=len(titles_success),
                    duration_seconds=total_dur,
                    resolution=res_str,
                    output_path=str(final_output_path),
                )
            except Exception:
                pass

            self._emit(ProgressSnapshot(
                status=PipelineStatus.DONE,
                overall_percent=100.0,
                message=f"Complete: {final_output_path}",
                output_file=str(final_output_path),
            ))

        except Exception as exc:
            safe_remove_directory(temp_dir)
            self._emit(ProgressSnapshot(
                status=PipelineStatus.ERROR,
                error=str(exc),
                message=f"Pipeline error: {exc}",
            ))


    def start(self) -> None:
        """Launch the pipeline in a background daemon thread (non-blocking)."""
        import threading as _threading
        self.is_running = True
        t = _threading.Thread(target=self._run_wrapper, daemon=True)
        t.start()

    def _run_wrapper(self) -> None:
        """Thread wrapper that clears is_running on completion."""
        try:
            self.run()
        finally:
            self.is_running = False
