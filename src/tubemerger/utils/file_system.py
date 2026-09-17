"""Filesystem and platform utility functions."""

import os
import shutil
from pathlib import Path
from typing import Optional

def ensure_directory(path: Path) -> Path:
    """Ensure a directory exists and is writable."""
    path.mkdir(parents=True, exist_ok=True)
    return path

def safe_remove_directory(path: Optional[Path]) -> None:
    """Safely remove a directory tree, ignoring errors."""
    if path and path.exists() and path.is_dir():
        try:
            shutil.rmtree(path, ignore_errors=True)
        except Exception:
            pass

def escape_posix_path(path: Path) -> str:
    """Format an absolute path for FFmpeg concat demuxer manifests."""
    posix_str = path.resolve().as_posix()
    escaped = posix_str.replace("'", r"'\''")
    return f"file '{escaped}'"
