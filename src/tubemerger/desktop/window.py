"""Native GUI window launcher with chromeless browser fallbacks."""

import os
import shutil
import subprocess
import sys
import time
import webbrowser

from tubemerger.core import settings
from tubemerger.desktop.env import log_desktop
from tubemerger.utils.process import get_clean_subprocess_env

_WIN_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def find_windows_chromium_browser() -> str | None:
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


def launch_desktop_window() -> None:
    """Open desktop interface via PyWebView or chromeless standalone browser window."""
    url = f"{settings.SERVER_URL}/"
    has_display = (sys.platform in ("win32", "darwin")) or bool(
        os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")
    )

    launched_gui = False
    if has_display:
        # 1. Primary: Native PyWebView GTK / Cocoa WebKit / WinForms / WebView2 desktop frame
        try:
            if sys.platform.startswith("linux"):
                try:
                    import gi
                    gi.require_version("Gtk", "3.0")
                    gi.require_version("Gdk", "3.0")
                    try:
                        gi.require_version("WebKit2", "4.1")
                        gi.require_version("Soup", "3.0")
                    except ValueError:
                        try:
                            gi.require_version("WebKit2", "4.0")
                            gi.require_version("Soup", "2.4")
                        except ValueError:
                            pass
                    from gi.repository import Gtk, GLib
                    try:
                        GLib.set_prgname("TubeMerger")
                        GLib.set_application_name("TubeMerger")
                    except Exception:
                        pass
                    icon_file = str(settings.PROJECT_ROOT / "assets" / "logo.png")
                    if os.path.exists(icon_file):
                        Gtk.Window.set_default_icon_from_file(icon_file)
                except Exception as e:
                    log_desktop(f"GTK pre-init warning: {e}")

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
            gui_backend = "gtk" if sys.platform.startswith("linux") else None
            debug_mode = bool(os.environ.get("TUBEMERGE_DEBUG", False))
            try:
                if gui_backend:
                    webview.start(storage_path=storage_dir, private_mode=False, gui=gui_backend, debug=debug_mode)
                else:
                    webview.start(storage_path=storage_dir, private_mode=False, debug=debug_mode)
            except TypeError:
                if gui_backend:
                    webview.start(gui=gui_backend, debug=debug_mode)
                else:
                    webview.start(debug=debug_mode)
            # If native window was closed by user, exit cleanly
            sys.exit(0)
        except Exception as exc:
            import traceback
            tb = traceback.format_exc()
            log_desktop(f"Native PyWebView window unavailable: {exc}\n{tb}")
            print(f"Native PyWebView window unavailable ({exc}). Checking for standalone desktop browser mode...")

        # 2. Secondary fallback: Chromeless Standalone Desktop App Window (--app=...)
        if not launched_gui:
            clean_env = get_clean_subprocess_env()
            if sys.platform == "win32":
                win_browser = find_windows_chromium_browser()
                if win_browser:
                    try:
                        subprocess.Popen(
                            [
                                win_browser,
                                f"--app={url}",
                                "--window-size=1280,820",
                            ],
                            creationflags=_WIN_NO_WINDOW,
                            env=clean_env,
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
                            subprocess.Popen(["open", "-a", b_app, "--args", f"--app={url}"], env=clean_env)
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
                            subprocess.Popen([
                                bin_path,
                                f"--app={url}",
                                "--window-size=1280,820",
                                "--class=TubeMerger",
                            ], env=clean_env)
                            launched_gui = True
                            print(f"Launched standalone desktop app window via {bin_name}.")
                            break
                        except Exception:
                            continue

    # 3. Tertiary fallback: System browser redirection
    if not launched_gui:
        print(f"TubeMerger is running at {settings.SERVER_URL}")
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        if sys.stdin and hasattr(sys.stdin, "isatty") and sys.stdin.isatty():
            input("[Press Enter or Ctrl+C to stop TubeMerger]\n")
        else:
            while True:
                time.sleep(1)
    except (KeyboardInterrupt, EOFError):
        print(f"Shutting down {settings.APP_NAME}. Goodbye.")
