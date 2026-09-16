#!/usr/bin/env python3
"""Root application entrypoint delegating to src/tubemerge."""

import os
import sys
import multiprocessing
from pathlib import Path

# CRITICAL: Prevent infinite subprocess fork bomb on Windows when frozen with PyInstaller
multiprocessing.freeze_support()

# Safeguard standard I/O streams in windowed (GUI) mode on Windows & macOS
if sys.stdout is None or sys.stderr is None:
    try:
        log_dir = os.path.join(os.path.expanduser("~"), ".tubemerger")
        os.makedirs(log_dir, exist_ok=True)
        log_f = open(os.path.join(log_dir, "desktop.log"), "a", encoding="utf-8", buffering=1)
        if sys.stdout is None:
            sys.stdout = log_f
        if sys.stderr is None:
            sys.stderr = log_f
    except Exception:
        class _NullStream:
            def write(self, t): return len(t)
            def flush(self): pass
        if sys.stdout is None:
            sys.stdout = _NullStream()
        if sys.stderr is None:
            sys.stderr = _NullStream()

# Add src/ to sys.path
SRC_DIR = Path(__file__).resolve().parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# If running unbundled and local .venv exists, ensure we run with .venv python where webview is installed
if not getattr(sys, "frozen", False):
    venv_python = Path(__file__).resolve().parent / ".venv" / "bin" / "python"
    if venv_python.exists() and sys.executable != str(venv_python):
        try:
            import webview
        except ImportError:
            os.execv(str(venv_python), [str(venv_python)] + sys.argv)

from tubemerge.app import run

if __name__ == "__main__":
    run()
