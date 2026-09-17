import os
import re
import sys
import subprocess
from typing import Optional
from tubemerger.utils.process import get_hidden_subprocess_kwargs

_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0

class BinaryInspectorService:
    _cached_ffmpeg_version: Optional[str] = None
    _cached_ytdlp_version: Optional[str] = None

    @classmethod
    def get_ffmpeg_version(cls, path: str) -> Optional[str]:
        if cls._cached_ffmpeg_version:
            return cls._cached_ffmpeg_version
        try:
            res = subprocess.run(
                [path, "-version"],
                capture_output=True,
                text=True,
                timeout=5,
                **get_hidden_subprocess_kwargs(),
            )
            if res.returncode == 0:
                match = re.search(r"ffmpeg version\s+(\S+)", res.stdout)
                version = match.group(1) if match else "unknown"
                cls._cached_ffmpeg_version = version
                return version
        except Exception:
            pass
        return None

    @classmethod
    def get_ytdlp_version(cls, path: str) -> Optional[str]:
        if cls._cached_ytdlp_version:
            return cls._cached_ytdlp_version

        # Test the actual executable first
        if path:
            try:
                res = subprocess.run(
                    [path, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    **get_hidden_subprocess_kwargs(),
                )
                if res.returncode == 0:
                    version = res.stdout.strip()
                    cls._cached_ytdlp_version = version
                    return version
            except Exception:
                pass

        # In-process yt_dlp version check fallback
        try:
            import yt_dlp
            version = getattr(yt_dlp.version, "__version__", None)
            if version:
                cls._cached_ytdlp_version = str(version)
                return cls._cached_ytdlp_version
        except Exception:
            pass

        return None
