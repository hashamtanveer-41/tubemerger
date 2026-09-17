"""Video Normalizer Service — Standardizes resolution, frame-rate, and audio.

All clips are re-encoded to a unified canvas BEFORE concatenation to prevent
resolution fractures, FPS mismatches, and audio desync in the final output.

No licensing or capability checks — TubeMerge is 100% free and open-source.
"""

import sys
import subprocess
from pathlib import Path
from typing import Optional, Callable

from tubemerger.core import settings
from tubemerger.utils.process import get_hidden_subprocess_kwargs


class VideoNormalizerService:
    """Standardizes arbitrary video clips to a uniform resolution, CFR, and AAC stereo."""

    def __init__(self, ffmpeg_path: str, process_registry: Optional[list] = None):
        self.ffmpeg_path = ffmpeg_path
        # Shared registry — callers can pass a list to track Popen handles for SIGKILL on exit
        self._process_registry = process_registry if process_registry is not None else []

    @staticmethod
    def build_filter_graph(target_w: int, target_h: int, fps: int = 30) -> str:
        """Scale preserving aspect ratio, pad with black bars, enforce 1:1 SAR and constant FPS."""
        return (
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
            f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"setsar=1,"
            f"fps={fps}"
        )

    def normalize(
        self,
        input_path: Path,
        output_path: Path,
        target_w: int = 1920,
        target_h: int = 1080,
        fps: int = 30,
        crf: int = settings.DEFAULT_CRF,
        audio_bitrate: str = settings.DEFAULT_AUDIO_BITRATE,
        on_log: Optional[Callable[[str], None]] = None,
    ) -> bool:
        """Re-encode a single clip to the target canvas/FPS/audio spec.

        Uses libx264 + AAC for maximum compatibility. Hardware acceleration
        (NVENC/VideoToolbox) can be layered in here in a future iteration.
        """
        filter_graph = self.build_filter_graph(target_w, target_h, fps)

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(input_path),
            "-vf", filter_graph,
            "-r", str(fps),
            "-fps_mode", "cfr",
            # Video encoder
            "-c:v", "libx264",
            "-crf", str(crf),
            "-preset", "fast",
            "-pix_fmt", "yuv420p",
            # Audio encoder — standardize to AAC 44.1 kHz stereo
            "-c:a", "aac",
            "-ar", str(settings.AUDIO_SAMPLE_RATE),
            "-ac", str(settings.AUDIO_CHANNELS),
            "-b:a", audio_bitrate,
            str(output_path),
        ]

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            **get_hidden_subprocess_kwargs(),
        )

        # Register process handle for SIGKILL on app exit
        self._process_registry.append(proc)

        try:
            while True:
                line = proc.stderr.readline() if proc.stderr else ""
                if not line and proc.poll() is not None:
                    break
                if line and on_log:
                    on_log(line.strip())
            proc.wait()
        finally:
            # Deregister once done
            try:
                self._process_registry.remove(proc)
            except ValueError:
                pass

        return proc.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0
