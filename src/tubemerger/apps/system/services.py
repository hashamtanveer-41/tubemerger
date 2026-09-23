"""System Service - Interacts with host OS desktop environment."""

import os
import json
import shutil
import platform
import subprocess
from pathlib import Path
from tubemerger.core import settings
from tubemerger.utils.process import get_clean_subprocess_env

class SystemService:
    """Invokes native file managers and media players across OS platforms."""

    @staticmethod
    def _clean_path(path_str: str) -> Path:
        """Strip quotes and resolve path."""
        cleaned = (path_str or "").strip().strip("'\"").strip()
        if not cleaned:
            return settings.DEFAULT_OUTPUT_DIR
        return Path(cleaned).expanduser().resolve()

    @classmethod
    def open_file(cls, path_str: str) -> bool:
        """Open file in system default media player. If folder, plays first media clip."""
        p = cls._clean_path(path_str)
        if not p.exists():
            return False

        # If it's a directory (e.g. downloaded individual videos), find first playable media
        if p.is_dir():
            candidates = sorted(
                list(p.glob("*.mp4")) + list(p.glob("*.mkv")) + list(p.glob("*.mp3")) +
                list(p.glob("*.webm")) + list(p.glob("*.m4a"))
            )
            if candidates:
                p = candidates[0]
            else:
                return cls.open_folder(path_str)

        system = platform.system()
        clean_env = get_clean_subprocess_env()
        try:
            if system == "Linux":
                opened = False
                for bin_name in ["xdg-open", "gio", "vlc", "mpv", "totem"]:
                    bin_path = shutil.which(bin_name)
                    if not bin_path:
                        continue
                    try:
                        cmd = [bin_path, "open", str(p)] if bin_name == "gio" else [bin_path, str(p)]
                        subprocess.Popen(
                            cmd,
                            env=clean_env,
                            stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            start_new_session=True,
                        )
                        opened = True
                        break
                    except Exception:
                        continue
                return opened
            elif system == "Darwin":
                subprocess.Popen(
                    ["open", str(p)],
                    env=clean_env,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
            elif system == "Windows":
                os.startfile(str(p))
            return True
        except Exception:
            return False

    @classmethod
    def open_folder(cls, path_str: str) -> bool:
        """Open containing folder in Nautilus / Explorer / Finder, selecting the file if applicable."""
        p = cls._clean_path(path_str)
        if not p.exists():
            if p.parent.exists():
                p = p.parent
            else:
                p = settings.DEFAULT_OUTPUT_DIR
                if not p.exists():
                    p = Path.home()

        system = platform.system()
        clean_env = get_clean_subprocess_env()
        try:
            if system == "Windows":
                if p.is_file():
                    subprocess.Popen(
                        f'explorer /select,"{p}"',
                        shell=True,
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                else:
                    os.startfile(str(p))
            elif system == "Darwin":
                if p.is_file():
                    subprocess.Popen(
                        ["open", "-R", str(p)],
                        env=clean_env,
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
                else:
                    subprocess.Popen(
                        ["open", str(p)],
                        env=clean_env,
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
            elif system == "Linux":
                target_dir = p if p.is_dir() else p.parent
                if not target_dir.exists():
                    target_dir = settings.DEFAULT_OUTPUT_DIR
                    if not target_dir.exists():
                        target_dir = Path.home()

                opened = False

                # 1. If pointing to a specific file, try file-manager select commands (highlights file in GUI)
                if p.is_file():
                    if shutil.which("nautilus"):
                        try:
                            subprocess.Popen(
                                ["nautilus", "--select", str(p)],
                                env=clean_env,
                                stdin=subprocess.DEVNULL,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                start_new_session=True,
                            )
                            opened = True
                        except Exception:
                            pass
                    elif shutil.which("dolphin"):
                        try:
                            subprocess.Popen(
                                ["dolphin", "--select", str(p)],
                                env=clean_env,
                                stdin=subprocess.DEVNULL,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                start_new_session=True,
                            )
                            opened = True
                        except Exception:
                            pass

                # 2. Open directory with standard Linux desktop file managers
                if not opened:
                    candidates = ["xdg-open", "gio", "nautilus", "dolphin", "nemo", "thunar", "pcmanfm"]
                    for bin_name in candidates:
                        bin_path = shutil.which(bin_name)
                        if not bin_path:
                            continue
                        try:
                            cmd = [bin_path, "open", str(target_dir)] if bin_name == "gio" else [bin_path, str(target_dir)]
                            subprocess.Popen(
                                cmd,
                                env=clean_env,
                                stdin=subprocess.DEVNULL,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                start_new_session=True,
                            )
                            opened = True
                            break
                        except Exception:
                            continue

                return opened
            return True
        except Exception:
            return False

    @classmethod
    def open_url(cls, url: str) -> bool:
        """Open web URL or mailto link in host system's default browser/client with clean environment."""
        cleaned = (url or "").strip()
        if not cleaned.startswith(("http://", "https://", "mailto:")):
            return False
        system = platform.system()
        try:
            if system == "Linux":
                clean_env = get_clean_subprocess_env()
                for bin_name in ["xdg-open", "gio"]:
                    bin_path = shutil.which(bin_name)
                    if not bin_path:
                        continue
                    try:
                        cmd = [bin_path, "open", cleaned] if bin_name == "gio" else [bin_path, cleaned]
                        subprocess.Popen(
                            cmd,
                            env=clean_env,
                            stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            start_new_session=True,
                        )
                        return True
                    except Exception:
                        continue
            import webbrowser
            return webbrowser.open(cleaned)
        except Exception:
            return False

    @classmethod
    def get_settings(cls) -> dict:
        """Retrieve persistent user settings from ~/.tubemerger/settings.json."""
        from tubemerger.apps.system.settings_store import UserSettingsStore
        return UserSettingsStore.get_settings()

    @classmethod
    def update_settings(cls, updates: dict) -> dict:
        """Update persistent settings in ~/.tubemerger/settings.json."""
        from tubemerger.apps.system.settings_store import UserSettingsStore
        return UserSettingsStore.update_settings(updates)



