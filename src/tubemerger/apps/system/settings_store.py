"""Persistent user configuration and settings store on local disk."""

import json
from tubemerger.core import settings


class UserSettingsStore:
    """Read and write desktop user preferences in ~/.tubemerger/settings.json."""

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
