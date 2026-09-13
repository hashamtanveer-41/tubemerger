"""System Service - Interacts with host OS desktop environment."""

import os
import json
import platform
import subprocess
from pathlib import Path
from tubemerge.core import settings

class SystemService:
    """Invokes native file managers and media players across OS platforms."""

    @staticmethod
    def _clean_path(path_str: str) -> Path:
        """Strip quotes and resolve path."""
        cleaned = (path_str or "").strip().strip("'\"").strip()
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
        try:
            if system == "Linux":
                subprocess.Popen(
                    ["xdg-open", str(p)],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
            elif system == "Darwin":
                subprocess.Popen(
                    ["open", str(p)],
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
                return False

        system = platform.system()
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
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
                else:
                    subprocess.Popen(
                        ["open", str(p)],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
            elif system == "Linux":
                target_dir = p if p.is_dir() else p.parent
                # Try xdg-open first, fallback to gio open
                try:
                    subprocess.Popen(
                        ["xdg-open", str(target_dir)],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
                except Exception:
                    subprocess.Popen(
                        ["gio", "open", str(target_dir)],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
            return True
        except Exception:
            return False

    @classmethod
    def open_url(cls, url: str) -> bool:
        """Open web URL in host system's default browser."""
        cleaned = (url or "").strip()
        if not cleaned.startswith(("http://", "https://")):
            return False
        import webbrowser
        try:
            return webbrowser.open(cleaned)
        except Exception:
            return False

    @classmethod
    def get_settings(cls) -> dict:
        """Retrieve persistent user settings from ~/.tubemerger/settings.json."""
        if not settings.SETTINGS_FILE.exists():
            return {"tour_completed": False}
        try:
            content = settings.SETTINGS_FILE.read_text(encoding="utf-8").strip()
            if content:
                data = json.loads(content)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
        return {"tour_completed": False}

    @classmethod
    def update_settings(cls, updates: dict) -> dict:
        """Update persistent settings in ~/.tubemerger/settings.json."""
        current = cls.get_settings()
        if isinstance(updates, dict):
            current.update(updates)
        try:
            settings.SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            settings.SETTINGS_FILE.write_text(json.dumps(current, indent=2), encoding="utf-8")
        except Exception:
            pass
        return current


