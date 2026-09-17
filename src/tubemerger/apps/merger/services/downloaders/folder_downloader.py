"""Dedicated downloader strategy for unmerged batch downloads to a folder."""

import logging
import random
import time
import uuid
from pathlib import Path
from typing import Callable, List, Optional

from tubemerger.apps.history.services import HistoryService
from tubemerger.apps.merger.services.format_builder import build_download_command
from tubemerger.apps.merger.services.specs import PipelineStatus, ProgressSnapshot
from tubemerger.apps.telemetry.service import categorize_ytdlp_error, is_resolvable_error
from tubemerger.utils.file_system import safe_remove_directory

logger = logging.getLogger(__name__)


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
        ).strip()
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

        for idx, clip in enumerate(selected_entries, start=1):
            self._check_pause()
            if self._is_cancelled():
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            clean_clip_title = "".join(
                c for c in clip.title if c.isalnum() or c in " _-"
            ).strip()
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
                    message=f"Verified ({idx}/{total_videos}): {clip.title} (already downloaded)",
                ))
                continue

            pct = (idx / total_videos) * 98.0
            self._emit(ProgressSnapshot(
                status=PipelineStatus.DOWNLOADING,
                current_item=idx,
                total_items=total_videos,
                current_video_title=clip.title,
                overall_percent=pct,
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

            def _folder_progress(clip_pct: float, spd: str):
                overall = ((idx - 1 + (clip_pct / 100.0)) / total_videos) * 98.0
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=round(overall, 1),
                    speed=spd or None,
                    message=(
                        f"Downloading ({idx}/{total_videos}): {clip.title} • {spd}"
                        if spd
                        else f"Downloading ({idx}/{total_videos}): {clip.title}"
                    ),
                ))

            rc, stderr_out = self._run_download(dl_cmd, on_progress_update=_folder_progress)

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
                            overall_percent=round(pct, 1),
                            message=f"Network hiccup on '{clip.title}', retrying ({attempt}/2) in {int(backoff_sec)}s…",
                        ))
                        time.sleep(backoff_sec)
                        if self._is_cancelled():
                            break
                        rc, stderr_out = self._run_download(dl_cmd, on_progress_update=_folder_progress)
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
                    raise RuntimeError(
                        f"YouTube rate limit detected (circuit breaker tripped after {consecutive_failures} consecutive failures). "
                        f"Stopped early to protect your connection ({err_sub}): {last_folder_err[:200]}"
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
            raise RuntimeError(f"No files could be downloaded from this playlist{err_suffix}.")

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
            status=PipelineStatus.DONE,
            overall_percent=100.0,
            message=msg,
            output_file=str(target_folder),
        ))
