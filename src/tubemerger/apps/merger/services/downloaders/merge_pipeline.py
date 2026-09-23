"""Multi-stage merge pipeline: Download clips → Normalize → Stitch → Embed chapters."""

import logging
import random
import time
import uuid
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from tubemerger.apps.history.services import HistoryService
from tubemerger.apps.merger.services.format_builder import build_download_command
from tubemerger.apps.merger.services.normalizer import VideoNormalizerService
from tubemerger.apps.merger.services.progress_parser import format_seconds_remaining
from tubemerger.apps.merger.services.specs import PipelineStatus, ProgressSnapshot
from tubemerger.apps.merger.services.stitcher import VideoStitcherService
from tubemerger.apps.telemetry.service import categorize_ytdlp_error, is_resolvable_error
from tubemerger.core import settings
from tubemerger.utils.file_system import safe_remove_directory

logger = logging.getLogger(__name__)


class MergePipeline:
    """Orchestrates multi-stage download, normalization, concatenation, and chapter tagging."""

    def __init__(
        self,
        ytdlp_path: str,
        ffmpeg_path: str,
        normalizer_service: VideoNormalizerService,
        stitcher_service: VideoStitcherService,
        run_download_fn: Callable,
        probe_duration_fn: Callable[[Path], Optional[float]],
        emit_fn: Callable[[ProgressSnapshot], None],
        check_pause_fn: Callable[[], None],
        check_cancelled_fn: Callable[[], bool],
    ):
        self.ytdlp_path = ytdlp_path
        self.ffmpeg_path = ffmpeg_path
        self.normalizer_service = normalizer_service
        self.stitcher_service = stitcher_service
        self._run_download = run_download_fn
        self._probe_duration = probe_duration_fn
        self._emit = emit_fn
        self._check_pause = check_pause_fn
        self._is_cancelled = check_cancelled_fn

    def execute(
        self,
        selected_entries: List,
        playlist,
        job_spec,
        metadata_service,
        is_audio: bool,
        final_output_path: Path,
        temp_dir: Path,
    ) -> None:
        """Run download, normalization, concat, and chapter embedding sequentially."""
        # 1. Canvas determination (for video)
        canvas_key = job_spec.quality or job_spec.canvas_preset
        preset = settings.CANVAS_PRESETS.get(
            canvas_key,
            settings.CANVAS_PRESETS.get("1080p", settings.CANVAS_PRESETS["auto"]),
        )
        target_w, target_h, target_fps = preset["width"], preset["height"], preset["fps"]

        if not is_audio and canvas_key == "auto" and selected_entries[0].url:
            pw, ph, pfps = metadata_service.probe_canvas(selected_entries[0].url)
            target_w, target_h, target_fps = pw, ph, pfps

        total_videos = len(selected_entries)
        raw_files: List[Tuple] = []
        last_merge_err = ""
        consecutive_failures = 0
        circuit_breaker_limit = 3
        archive_file = temp_dir / ".tubemerge_archive.txt"
        start_time = time.time()

        # 2. Download phase
        last_speed = [None]
        last_eta = [None]
        for idx, clip in enumerate(selected_entries, start=1):
            self._check_pause()
            if self._is_cancelled():
                self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                return

            # Idempotency Check: if raw clip already exists in temp_dir, skip downloading
            existing_candidates = [
                p for p in temp_dir.glob(f"raw_{idx:04d}.*")
                if not p.name.endswith((".part", ".ytdl"))
                and (not is_audio or p.name.endswith(".mp3"))
                and p.stat().st_size > 1024
            ]
            if existing_candidates:
                logger.info("Clip %d already in temp cache (%s), skipping.", idx, existing_candidates[0].name)
                raw_files.append((clip, existing_candidates[0]))
                consecutive_failures = 0
                pct = 5.0 + (idx / total_videos) * 40.0
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.DOWNLOADING,
                    current_item=idx,
                    total_items=total_videos,
                    current_video_title=clip.title,
                    overall_percent=round(pct, 1),
                    speed=last_speed[0],
                    eta=last_eta[0],
                    message=f"Verified ({idx}/{total_videos}): {clip.title} (cached)",
                ))
                continue

            base_pct = 5.0 + (((idx - 1) / total_videos) * 40.0)
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

            out_template = str(temp_dir / f"raw_{idx:04d}.%(ext)s")
            dl_cmd = build_download_command(
                ytdlp_path=self.ytdlp_path,
                ffmpeg_path=self.ffmpeg_path,
                out_template=out_template,
                url=clip.url,
                is_audio=is_audio,
                quality=job_spec.quality or job_spec.canvas_preset,
                audio_bitrate=getattr(job_spec, "audio_bitrate", None),
                is_batch=True,
                archive_path=archive_file,
            )

            clip_highest_pct = [0.0]

            def _merge_dl_progress(clip_pct: float, spd: str, eta: Optional[str] = None):
                clip_highest_pct[0] = max(clip_highest_pct[0], clip_pct)
                effective_clip_pct = clip_highest_pct[0]
                overall = 5.0 + (((idx - 1 + (effective_clip_pct / 100.0)) / total_videos) * 40.0)

                completed_ratio = (idx - 1 + (effective_clip_pct / 100.0)) / total_videos
                elapsed = time.time() - start_time
                pipeline_eta = None
                if completed_ratio > 0.01 and elapsed > 2.0:
                    est_download_total = elapsed / completed_ratio
                    # Downloading represents ~45% of total pipeline; project overall remaining time
                    est_full_pipeline = est_download_total * 1.5
                    remaining_sec = max(0.0, est_full_pipeline - elapsed)
                    pipeline_eta = format_seconds_remaining(remaining_sec)

                display_eta = pipeline_eta or eta
                if spd:
                    last_speed[0] = spd
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
                        if spd
                        else f"Downloading ({idx}/{total_videos}): {clip.title}"
                    ),
                ))

            def _merge_dl_status(status_msg: str):
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
                on_progress_update=_merge_dl_progress,
                on_status_update=_merge_dl_status,
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
                            on_progress_update=_merge_dl_progress,
                            on_status_update=_merge_dl_status,
                        )
                        if rc == 0:
                            logger.info("Retry %d succeeded for %s!", attempt, clip.title)
                            break

            if rc != 0:
                consecutive_failures += 1
                last_merge_err = (stderr_out or "").strip()
                logger.warning(
                    "Download failed for %s (%d consecutive fails): %s",
                    clip.title, consecutive_failures, last_merge_err[:200]
                )

                # Fast-Fail Circuit Breaker: Halt early if YouTube is blocking at the start
                if consecutive_failures >= circuit_breaker_limit and len(raw_files) == 0:
                    err_sub = categorize_ytdlp_error(last_merge_err)
                    raise RuntimeError(
                        f"YouTube rate limit detected (circuit breaker tripped after {consecutive_failures} consecutive failures). "
                        f"Stopped early to protect your connection ({err_sub}): {last_merge_err[:200]}"
                    )
                continue
            else:
                consecutive_failures = 0

            candidates = [
                p for p in temp_dir.glob(f"raw_{idx:04d}.*")
                if not p.name.endswith((".part", ".ytdl")) and (not is_audio or p.name.endswith(".mp3"))
            ]
            if candidates:
                raw_files.append((clip, candidates[0]))

        if not raw_files:
            err_sub = categorize_ytdlp_error(last_merge_err)
            err_suffix = f" ({err_sub}): {last_merge_err[:200]}" if last_merge_err else ""
            raise RuntimeError(f"No files were successfully downloaded{err_suffix}; nothing to merge.")

        # 3. Normalization phase
        normalized_files: List[Path] = []
        durations: List[float] = []
        titles_success: List[str] = []

        if is_audio:
            normalized_files = [p for _, p in raw_files]
            durations = [self._probe_duration(p) or float(c.duration_seconds or 180.0) for c, p in raw_files]
            titles_success = [c.title for c, _ in raw_files]
        else:
            for idx, (clip, raw_path) in enumerate(raw_files, start=1):
                if self._is_cancelled():
                    self._emit(ProgressSnapshot(status=PipelineStatus.CANCELLED, message="Cancelled."))
                    return

                pct_start = 45.0 + (((idx - 1) / len(raw_files)) * 35.0)
                self._emit(ProgressSnapshot(
                    status=PipelineStatus.NORMALIZING,
                    current_item=idx,
                    total_items=len(raw_files),
                    current_video_title=clip.title,
                    overall_percent=round(pct_start, 1),
                    message=f"Normalising ({idx}/{len(raw_files)}): {clip.title}",
                ))

                norm_path = temp_dir / f"norm_{idx:04d}.mp4"
                success = self.normalizer_service.normalize(
                    input_path=raw_path,
                    output_path=norm_path,
                    target_w=target_w,
                    target_h=target_h,
                    fps=target_fps,
                    crf=job_spec.crf,
                )

                raw_path.unlink(missing_ok=True)

                if success:
                    normalized_files.append(norm_path)
                    dur = self._probe_duration(norm_path) or float(clip.duration_seconds or 1.0)
                    durations.append(dur)
                    titles_success.append(clip.title)
                    pct_done = 45.0 + ((idx / len(raw_files)) * 35.0)
                    self._emit(ProgressSnapshot(
                        status=PipelineStatus.NORMALIZING,
                        current_item=idx,
                        total_items=len(raw_files),
                        current_video_title=clip.title,
                        overall_percent=round(pct_done, 1),
                        message=f"Normalised ({idx}/{len(raw_files)}): {clip.title}",
                    ))

            if not normalized_files:
                raise RuntimeError("Normalization failed for all video segments.")

        # 4. Stitching phase
        if self._is_cancelled():
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

        # 5. Chapter embedding (for video)
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

        # 6. Persist history
        safe_remove_directory(temp_dir)
        try:
            total_dur = int(sum(durations))
            res_str = "Merged MP3" if is_audio else (
                f"{target_h}p" if target_h <= 1080
                else ("4K 60FPS" if target_h <= 2160 else "8K")
            )
            HistoryService.add_history_entry(
                job_id=str(uuid.uuid4()),
                playlist_title=playlist.title or ("Merged Playlist (Audio)" if is_audio else "Merged Playlist"),
                playlist_url=job_spec.playlist_url,
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
