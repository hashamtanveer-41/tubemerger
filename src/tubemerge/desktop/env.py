"""Platform desktop environment setup, stdio redirection, and diagnostics logging."""

import os
import sys
import time
import multiprocessing

# Prevent infinite subprocess fork bomb on Windows when packaged with PyInstaller
multiprocessing.freeze_support()


class _NullStream:
    def write(self, text: str) -> int:
        return len(text)

    def flush(self) -> None:
        pass


def init_stdio() -> None:
    """Ensure stdout, stderr, and stdin are never None in windowed/GUI mode."""
    if sys.stdout is None or sys.stderr is None:
        try:
            log_dir = os.path.join(os.path.expanduser("~"), ".tubemerger")
            os.makedirs(log_dir, exist_ok=True)
            log_file = open(os.path.join(log_dir, "desktop.log"), "a", encoding="utf-8", buffering=1)
            if sys.stdout is None:
                sys.stdout = log_file
            if sys.stderr is None:
                sys.stderr = log_file
        except Exception:
            if sys.stdout is None:
                sys.stdout = _NullStream()
            if sys.stderr is None:
                sys.stderr = _NullStream()

    if sys.stdin is None:
        class _NullStdin:
            def readline(self) -> str:
                return ""

            def read(self, *args) -> str:
                return ""

            def isatty(self) -> bool:
                return False

        sys.stdin = _NullStdin()


def log_desktop(msg: str) -> None:
    """Append a timestamped log line to ~/.tubemerger/desktop.log."""
    try:
        log_dir = os.path.join(os.path.expanduser("~"), ".tubemerger")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "desktop.log"), "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass


def setup_desktop_environment() -> None:
    """Configure platform-specific GUI variables and process IDs."""
    init_stdio()

    # Linux desktop environment fixes for GObject Introspection & WebKitGTK
    if sys.platform.startswith("linux"):
        # 1. Ensure system typelibs are discoverable inside PyInstaller frozen bundles
        system_gi_dirs = [
            "/usr/lib/x86_64-linux-gnu/girepository-1.0",
            "/usr/lib/girepository-1.0",
            "/usr/lib64/girepository-1.0",
            "/usr/local/lib/girepository-1.0",
        ]
        existing = os.environ.get("GI_TYPELIB_PATH", "")
        gi_paths = [p for p in existing.split(":") if p]
        for sp in system_gi_dirs:
            if os.path.isdir(sp) and sp not in gi_paths:
                gi_paths.append(sp)
        if gi_paths:
            os.environ["GI_TYPELIB_PATH"] = ":".join(gi_paths)

        # 2. Disable WebKitGTK DMA-BUF renderer on Wayland to prevent GPU buffer sharing crashes
        if "WEBKIT_DISABLE_DMABUF_RENDERER" not in os.environ:
            os.environ["WEBKIT_DISABLE_DMABUF_RENDERER"] = "1"

    # Set Windows AppUserModelID so Windows 11 taskbar & start menu properly group and display the app icon
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("TubeMerge.Desktop.App")
        except Exception:
            pass
