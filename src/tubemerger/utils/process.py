"""Process execution utilities to ensure background processes never spawn visible console windows and run in a clean environment."""

import os
import sys
import subprocess
from typing import Dict, Any

def get_clean_subprocess_env() -> Dict[str, str]:
    """Return a clean environment dictionary for spawning external subprocesses.

    When running inside a PyInstaller frozen bundle on Linux or macOS, PyInstaller sets
    LD_LIBRARY_PATH, DYLD_LIBRARY_PATH, etc. to its bundled _internal directory.
    External processes (such as python3, yt-dlp, or system ffmpeg) inheriting these
    variables fail with dynamic linker / symbol mismatch errors (e.g. OpenSSL/libcrypto).

    PyInstaller preserves pre-launch environments in <VAR>_ORIG.
    """
    env = dict(os.environ)

    # Clean dynamic linker paths across Linux and macOS
    for var in [
        "LD_LIBRARY_PATH",
        "DYLD_LIBRARY_PATH",
        "DYLD_FALLBACK_LIBRARY_PATH",
        "DYLD_FRAMEWORK_PATH",
    ]:
        orig = f"{var}_ORIG"
        if orig in env:
            env[var] = env[orig]
        else:
            env.pop(var, None)

    # On macOS, ensure standard Homebrew, MacPorts, and user local bin are in PATH
    if sys.platform == "darwin":
        current_path = env.get("PATH", "")
        extra_paths = [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/opt/local/bin",
            os.path.expanduser("~/.local/bin"),
        ]
        parts = current_path.split(":") if current_path else []
        for ep in extra_paths:
            if ep not in parts and os.path.isdir(ep):
                parts.insert(0, ep)
        env["PATH"] = ":".join(parts)

    return env


def get_hidden_subprocess_kwargs() -> Dict[str, Any]:
    """Return creationflags, startupinfo, and clean env for background subprocesses."""
    kwargs: Dict[str, Any] = {
        "env": get_clean_subprocess_env()
    }
    if sys.platform == "win32":
        # CREATE_NO_WINDOW (0x08000000) prevents creating a console window
        kwargs["creationflags"] = 0x08000000
        # STARTUPINFO with SW_HIDE (0) forces any launched process window to be hidden
        if hasattr(subprocess, "STARTUPINFO"):
            si = subprocess.STARTUPINFO()
            if hasattr(subprocess, "STARTF_USESHOWWINDOW"):
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0
            kwargs["startupinfo"] = si
    return kwargs

