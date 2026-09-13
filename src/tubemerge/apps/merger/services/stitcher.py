"""Video Stitcher Service - Concat demuxing and chapter embedding."""

import os
import subprocess
import sys
_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
from pathlib import Path
from typing import List, Optional

from tubemerge.utils.file_system import escape_posix_path
from tubemerge.utils.process import get_hidden_subprocess_kwargs

class VideoStitcherService:
    """Concatenates normalized segments and writes embedded MP4 chapters."""

    def __init__(self, ffmpeg_path: str):
        self.ffmpeg_path = ffmpeg_path

    @staticmethod
    def write_manifest(file_paths: List[Path], manifest_path: Path) -> None:
        """Write FFmpeg concat demuxer manifest file with POSIX escaping."""
        lines = [escape_posix_path(p) for p in file_paths]
        manifest_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def stitch_segments(self, manifest_path: Path, output_path: Path, is_audio: bool = False) -> bool:
        """Run FFmpeg concat demuxer with stream copy, falling back to audio re-encode for mp3."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(manifest_path),
            "-c", "copy",
            str(output_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, **get_hidden_subprocess_kwargs())
        if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
            return True
        if is_audio:
            cmd_reencode = [
                self.ffmpeg_path,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(manifest_path),
                "-c:a", "libmp3lame",
                "-q:a", "2",
                str(output_path),
            ]
            res_re = subprocess.run(cmd_reencode, capture_output=True, text=True, **get_hidden_subprocess_kwargs())
            return res_re.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0
        return False

    @staticmethod
    def build_chapter_metadata(titles: List[str], durations_seconds: List[float]) -> str:
        """Generate INI-format ;FFMETADATA1 string with millisecond chapters."""
        lines = [";FFMETADATA1"]
        current_ms = 0

        for title, dur in zip(titles, durations_seconds):
            dur_ms = int(dur * 1000)
            end_ms = current_ms + dur_ms
            # Escape \, =, ;, #, and newlines according to FFmpeg FFMETADATA1 specification
            clean_title = (
                title.replace("\\", "\\\\")
                .replace("=", "\\=")
                .replace(";", "\\;")
                .replace("#", "\\#")
                .replace("\n", " ")
                .strip()
            )
            lines.extend([
                "",
                "[CHAPTER]",
                "TIMEBASE=1/1000",
                f"START={current_ms}",
                f"END={end_ms}",
                f"title={clean_title}",
            ])
            current_ms = end_ms

        return "\n".join(lines) + "\n"

    def embed_chapters(self, video_path: Path, metadata_path: Path) -> bool:
        """Embed chapters into video container via metadata mapping."""
        temp_out = video_path.with_name(f"chapters_{video_path.name}")
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(video_path),
            "-i", str(metadata_path),
            "-map_metadata", "1",
            "-codec", "copy",
            str(temp_out),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, **get_hidden_subprocess_kwargs())
        if res.returncode == 0 and temp_out.exists() and temp_out.stat().st_size > 0:
            temp_out.replace(video_path)
            return True
        if temp_out.exists():
            temp_out.unlink(missing_ok=True)
        return False
