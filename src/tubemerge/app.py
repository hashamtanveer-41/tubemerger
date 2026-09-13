import os
import sys
import time
import shutil
import subprocess
import threading
import multiprocessing
import urllib.request
import webbrowser

# CRITICAL: Prevent infinite subprocess fork bomb on Windows when packaged with PyInstaller
multiprocessing.freeze_support()

_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0

# Ensure stdio streams are never None (critical for PyInstaller windowed / GUI mode on Windows & macOS)
class _NullStream:
    def write(self, text: str) -> int:
        return len(text)
    def flush(self) -> None:
        pass

def _init_stdio() -> None:
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

_init_stdio()

# Set Windows AppUserModelID so Windows 11 taskbar & start menu properly group and display the app icon
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("TubeMerge.Desktop.App")
    except Exception:
        pass

import uvicorn
from tubemerge.core import settings
from tubemerge.data.banner import BANNER
from tubemerge.server.app import create_app

def _start_server(port: int) -> None:
    app = create_app()
    config = uvicorn.Config(
        app=app,
        host=settings.HOST,
        port=port,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    server.run()

def _wait_for_server(timeout: float = 12.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{settings.SERVER_URL}/api/ping", timeout=0.5) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.1)
    return False

def _find_windows_chromium_browser() -> str | None:
    """Locate Microsoft Edge or Google Chrome on Windows for chromeless --app window mode."""
    candidates = [
        # Microsoft Edge (Installed on 100% of Windows 10 & 11)
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        # Google Chrome
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        # Brave Browser
        os.path.expandvars(r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return shutil.which("msedge") or shutil.which("chrome")

def _launch_desktop_window() -> None:
    url = f"{settings.SERVER_URL}/"
    has_display = (sys.platform in ("win32", "darwin")) or bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))

    launched_gui = False
    if has_display:
        # 1. Primary: Native PyWebView GTK / Cocoa WebKit / WinForms / WebView2 desktop frame
        try:
            import webview
            window = webview.create_window(
                title=f"{settings.APP_NAME} – {settings.APP_TAGLINE}",
                url=url,
                width=1280,
                height=820,
                min_size=(960, 640),
                background_color="#0F0F0F",
            )
            storage_dir = str(settings.APP_DATA_DIR / "webview_data")
            os.makedirs(storage_dir, exist_ok=True)
            try:
                webview.start(storage_path=storage_dir, private_mode=False)
            except TypeError:
                webview.start()
            # If native window was closed by the user, terminate application cleanly
            sys.exit(0)
        except Exception as exc:
            print(f"Native PyWebView window unavailable ({exc}). Checking for standalone desktop browser mode...")

        # 2. Secondary fallback: Chromeless Standalone Desktop App Window (--app=...)
        if not launched_gui:
            if sys.platform == "win32":
                win_browser = _find_windows_chromium_browser()
                if win_browser:
                    try:
                        subprocess.Popen(
                            [
                                win_browser,
                                f"--app={url}",
                                "--window-size=1280,820",
                            ],
                            creationflags=_WIN_NO_WINDOW,
                        )
                        launched_gui = True
                        print(f"Launched standalone desktop app window via {win_browser}.")
                    except Exception as exc:
                        print(f"Failed to launch Windows chromeless app: {exc}")
            elif sys.platform == "darwin":
                mac_browsers = [
                    "/Applications/Google Chrome.app",
                    "/Applications/Brave Browser.app",
                    "/Applications/Microsoft Edge.app",
                ]
                for b_app in mac_browsers:
                    if os.path.isdir(b_app):
                        try:
                            subprocess.Popen(["open", "-a", b_app, "--args", f"--app={url}"])
                            launched_gui = True
                            print(f"Launched standalone desktop app window via {b_app}.")
                            break
                        except Exception:
                            continue
            else:
                chromium_bins = ["google-chrome", "chromium", "chromium-browser", "brave-browser", "microsoft-edge"]
                for bin_name in chromium_bins:
                    bin_path = shutil.which(bin_name)
                    if bin_path:
                        try:
                            # Opens as an isolated standalone desktop frame (no address bar, no tabs)
                            subprocess.Popen([
                                bin_path,
                                f"--app={url}",
                                "--window-size=1280,820",
                                "--class=TubeMerge",
                            ])
                            launched_gui = True
                            print(f"Launched standalone desktop app window via {bin_name}.")
                            break
                        except Exception:
                            continue

    # 3. Tertiary fallback: System browser redirection
    if not launched_gui:
        print(f"TubeMerge is running at {settings.SERVER_URL}")
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        if sys.stdin and hasattr(sys.stdin, "isatty") and sys.stdin.isatty():
            input("[Press Enter or Ctrl+C to stop TubeMerge]\n")
        else:
            while True:
                time.sleep(1)
    except (KeyboardInterrupt, EOFError):
        print(f"Shutting down {settings.APP_NAME}. Goodbye.")

def run() -> None:
    print(BANNER)
    print("Starting TubeMerge backend...")

    # Dynamic Port Allocation: Lease an ephemeral kernel port if 7842 is busy/held
    actual_port = settings.find_available_port(settings.HOST, settings.PORT)
    if actual_port != settings.PORT:
        print(f"Port {settings.PORT} is busy; dynamically bound to port {actual_port}.")
    settings.PORT = actual_port
    settings.SERVER_URL = f"http://{settings.HOST}:{actual_port}"

    server_thread = threading.Thread(target=_start_server, args=(actual_port,), daemon=True)
    server_thread.start()

    if not _wait_for_server():
        print("Backend failed to start.")
        sys.exit(1)

    print("Backend ready.")
    _launch_desktop_window()
