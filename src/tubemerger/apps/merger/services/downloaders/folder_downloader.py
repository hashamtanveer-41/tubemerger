"""Dedicated downloader strategy for unmerged batch downloads to a folder."""

import logging
import random
import time
import uuid
from pathlib import Path
from typing import Any, Callable, List, Optional

from tubemerger.apps.history.services import HistoryService
from tubemerger.apps.merger.services.format_builder import build_download_command
from tubemerger.apps.merger.services.progress_parser import format_seconds_remaining
from tubemerger.apps.merger.services.specs import PipelineStatus, ProgressSnapshot, PipelineExecutionError
from tubemerger.apps.telemetry.service import categorize_ytdlp_error, is_resolvable_error
from tubemerger.utils.file_system import safe_remove_directory

logger = logging.getLogger(__name__)


def format_download_speed(speed_val: Any, fallback: str = "0.0 B/s") -> str:
    """Safely extract and format download speed with a safe fallback to prevent crashes on initial chunk read."""
    if speed_val is None:
        return fallback
    if isinstance(speed_val, dict):
        speed_val = speed_val.get("speed") or 0.0
    if isinstance(speed_val, (int, float)):
        val = float(speed_val)
        if val <= 0:
            return fallback
        elif val < 1024:
            return f"{val:.1f}B/s"
        elif val < 1024 * 1024:
            return f"{val / 1024:.1f}KB/s"
        elif val < 1024 * 1024 * 1024:
            return f"{val / (1024 * 1024):.1f}MB/s"
        return f"{val / (1024 * 1024 * 1024):.1f}GB/s"
    s = str(speed_val).strip()
    return s if s and s.lower() not in ("none", "unknown", "n/a", "") else fallback


class FolderDownloader:
    """Handles batch downloads of playlist items into a dedicated directory."""

    def __init__(
        self,
        ytdlp_path: str,
        ffmpeg_path: str,
        run_download_fn: Callable,
        emit_fn: Callable[[ProgressSnapshot], None],
        check_pause_fn: Callable[[], None],
        check_cancelled_fn: Callable[[], bool],
    ):
        self.ytdlp_path = ytdlp_path
        self.ffmpeg_path = ffmpeg_path
        self._run_download = run_download_fn
        self._emit = emit_fn
        self._check_pause = check_pause_fn
        self._is_cancelled = check_cancelled_fn

    def download(
        self,
        selected_entries: List,
        playlist,
        job_id: str,
        is_audio: bool,
        quality: Optional[str],
        audio_bitrate: Optional[str],
        downloads_dir: Path,
        temp_dir: Path,
    ) -> None:
        """Download all selected playlist entries into a dedicated folder."""
        clean_playlist_title = "".join(
            c for c in (playlist.title or "Playlist") if c.isalnum() or c in " _-"
        ).strip()[:60]
        folder_prefix = "TubeMerger (Audio)" if is_audio else "TubeMerger"
        folder_name = (
            f"{folder_prefix} - {clean_playlist_title}"
            if clean_playlist_title
            else f"{folder_prefix}_Playlist_{job_id}"
        )
        target_folder = downloads_dir / folder_name
        target_folder.mkdir(parents=True, exist_ok=True)

        total_videos = len(selected_entries)
        downloaded_files: List[Path] = []
        durations: List[float] = []
        last_folder_err = ""
        consecutive_failures = 0
        circuit_breaker_limit = 3
        archive_file = target_folder / ".tubemerge_archive.txt"
        start_time = time.time()
        last_speed = ["0.0 B/s"]
        last_eta = [None]

        for idx, clip in enumerate(selected_entries, start=1):
            self._check_pause()
            if self._is_cancelled():
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            # Progressive 1.5s - 3.0s jitter delay between successive clip extractions on playlists > 30 videos
            if total_videos > 30 and idx > 1:
                progression = (idx - 1) / total_videos
                base_delay = 1.5 + (progression * 1.0)
                jitter_delay = base_delay + random.uniform(0.0, 0.5)
                time.sleep(min(3.0, max(1.5, jitter_delay)))

            clean_clip_title = "".join(
                c for c in clip.title if c.isalnum() or c in " _-"
            ).strip()[:80]
            if not clean_clip_title:
                clean_clip_title = f"track_{idx:02d}" if is_audio else f"video_{idx:02d}"

            # Idempotency Check: if output file already exists with non-zero size, skip downloading
            existing_candidates = [
                p for p in target_folder.glob(f"{idx:02d} - {clean_clip_title}.*")
                if not p.name.endswith((".part", ".ytdl"))
                and (not is_audio or p.name.endswith(".mp3"))
                and p.stat().st_size > 1024
            ]
            if existing_candidates:
                logger.info("Clip %d already exists on disk (%s), skipping.", idx, existing_candidates[0].name)
                downloaded_files.append(existing_candidates[0])
                durations.append(float(clip.duration_seconds or 0))
                consecutive_failures = 0
                pct = (idx / total_videos) * 98.0
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=round(pct, 1),
                    speed=last_speed[0],
                    eta=last_eta[0],
                    message=f"Verified ({idx}/{total_videos}): {clip.title} (already downloaded)",
                ))
                continue

            base_pct = ((idx - 1) / total_videos) * 98.0
            self._emit(ProgressSnapshot(
                status=PipelineStatus.DOWNLOADING,
                current_item=idx,
                total_items=total_videos,
                current_video_title=clip.title,
                overall_percent=round(base_pct, 1),
                speed=last_speed[0],
                eta=last_eta[0],
                message=f"Downloading ({idx}/{total_videos}): {clip.title}",
            ))

            out_template = str(target_folder / f"{idx:02d} - {clean_clip_title}.%(ext)s")
            dl_cmd = build_download_command(
                ytdlp_path=self.ytdlp_path,
                ffmpeg_path=self.ffmpeg_path,
                out_template=out_template,
                url=clip.url,
                is_audio=is_audio,
                quality=quality,
                audio_bitrate=audio_bitrate,
                is_batch=True,
                archive_path=archive_file,
            )

            clip_highest_pct = [0.0]

            def _folder_progress(clip_pct: Any, spd: Any = None, eta: Optional[str] = None):
                # Ensure the variable tracking download speed has a safe fallback default before formatting
                if isinstance(clip_pct, dict):
                    d = clip_pct
                    speed = d.get("speed") or 0.0
                    spd = format_download_speed(speed, fallback=last_speed[0] or "0.0 B/s")
                    downloaded = d.get("downloaded_bytes") or 0
                    total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                    raw_pct = (downloaded / total) * 100.0 if total > 0 else 0.0
                    clip_highest_pct[0] = max(clip_highest_pct[0], float(raw_pct))
                    eta = format_seconds_remaining(d.get("eta")) if d.get("eta") is not None else None
                else:
                    if isinstance(spd, dict):
                        speed = spd.get("speed") or 0.0
                        spd = format_download_speed(speed, fallback=last_speed[0] or "0.0 B/s")
                    elif spd is not None and not isinstance(spd, str):
                        spd = format_download_speed(spd, fallback=last_speed[0] or "0.0 B/s")
                    else:
                        spd = format_download_speed(spd, fallback=last_speed[0] or "0.0 B/s") if spd else (last_speed[0] or "0.0 B/s")

                    clip_highest_pct[0] = max(clip_highest_pct[0], float(clip_pct or 0.0))

                effective_clip_pct = clip_highest_pct[0]
                overall = ((idx - 1 + (effective_clip_pct / 100.0)) / total_videos) * 98.0

                # Calculate overall playlist remaining time based on elapsed time and completed progress
                completed_ratio = (idx - 1 + (effective_clip_pct / 100.0)) / total_videos
                elapsed = time.time() - start_time
                playlist_eta = None
                if completed_ratio > 0.01 and elapsed > 2.0:
                    estimated_total = elapsed / completed_ratio
                    remaining_sec = max(0.0, estimated_total - elapsed)
                    playlist_eta = format_seconds_remaining(remaining_sec)

                display_eta = playlist_eta or eta
                if spd and spd != "0.0 B/s":
                    last_speed[0] = spd
                elif not last_speed[0]:
                    last_speed[0] = spd or "0.0 B/s"

                if display_eta:
                    last_eta[0] = display_eta

                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=round(overall, 1),
                    speed=spd or last_speed[0],
                    eta=display_eta or last_eta[0],
                    message=(
                        f"Downloading ({idx}/{total_videos}): {clip.title} • {spd}"
                        if spd and spd != "0.0 B/s"
                        else f"Downloading ({idx}/{total_videos}): {clip.title}"
                    ),
                ))

            def _folder_status(status_msg: str):
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=round(base_pct, 1),
                    speed=last_speed[0],
                    eta=last_eta[0],
                    message=f"{status_msg} ({idx}/{total_videos}): {clip.title}",
                ))

            rc, stderr_out = self._run_download(
                dl_cmd,
                on_progress_update=_folder_progress,
                on_status_update=_folder_status,
            )

            # Automated in-engine retry for resolvable transient errors
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
                            current_item=idx,
                            total_items=total_videos,
                            current_video_title=clip.title,
                            overall_percent=round(base_pct, 1),
                            message=f"Network hiccup on '{clip.title}', retrying ({attempt}/2) in {int(backoff_sec)}s…",
                        ))
                        time.sleep(backoff_sec)
                        if self._is_cancelled():
                            break
                        rc, stderr_out = self._run_download(
                            dl_cmd,
                            on_progress_update=_folder_progress,
                            on_status_update=_folder_status,
                        )
                        if rc == 0:
                            logger.info("Retry %d succeeded for %s!", attempt, clip.title)
                            break

            if rc != 0:
                consecutive_failures += 1
                last_folder_err = (stderr_out or "").strip()
                logger.warning(
                    "Download failed for %s (%d consecutive fails): %s",
                    clip.title, consecutive_failures, last_folder_err[:200]
                )

                # Fast-Fail Circuit Breaker: Halt early if YouTube is blocking at the start
                if consecutive_failures >= circuit_breaker_limit and len(downloaded_files) == 0:
                    err_sub = categorize_ytdlp_error(last_folder_err)
                    raise PipelineExecutionError(
                        f"YouTube rate limit detected (circuit breaker tripped after {consecutive_failures} consecutive failures). "
                        f"Stopped early to protect your connection ({err_sub}): {last_folder_err[:200]}",
                        error_subtype=err_sub,
                        raw_error=last_folder_err,
                    )
                continue
            else:
                consecutive_failures = 0

            candidates = [
                p for p in target_folder.glob(f"{idx:02d} - {clean_clip_title}.*")
                if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
            ]
            if candidates:
                downloaded_files.append(candidates[0])
                durations.append(float(clip.duration_seconds or 0))

        if not downloaded_files:
            err_sub = categorize_ytdlp_error(last_folder_err)
            err_suffix = f" ({err_sub}): {last_folder_err[:200]}" if last_folder_err else ""
            raise PipelineExecutionError(
                f"No files could be downloaded from this playlist{err_suffix}.",
                error_subtype=err_sub,
                raw_error=last_folder_err,
            )

        safe_remove_directory(temp_dir)
        try:
            total_dur = int(sum(durations))
            HistoryService.add_history_entry(
                job_id=str(uuid.uuid4()),
                playlist_title=playlist.title or ("Playlist (Individual MP3s)" if is_audio else "Playlist (Individual Videos)"),
                playlist_url=playlist.webpage_url,
                channel_name=playlist.channel or "YouTube Creator",
                video_count=len(downloaded_files),
                duration_seconds=total_dur,
                resolution="Individual MP3s" if is_audio else "Individual Videos",
                output_path=str(target_folder),
            )
        except Exception:
            pass

        if len(downloaded_files) < total_videos:
            msg = f"Downloaded {len(downloaded_files)} of {total_videos} files to folder (remaining clips were rate-limited or skipped)."
        else:
            msg = f"Downloaded {len(downloaded_files)} files to: {target_folder}"

        self._emit(ProgressSnapshot(
            status=PipelineStatus.DOWNLOADING,
            overall_percent=100.0,
            message="Muxing video containers and writing chapter metadata...",
            sub_status="Muxing video containers and writing chapter metadata...",
            output_file=str(target_folder),
        ))

        self._emit(ProgressSnapshot(
            status=PipelineStatus.DONE,
            overall_percent=100.0,
            message=msg,
            output_file=str(target_folder),
        ))
