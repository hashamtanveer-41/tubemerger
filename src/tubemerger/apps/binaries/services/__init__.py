from pathlib import Path
from typing import Dict, Optional, Tuple
from tubemerger.core import settings
from tubemerger.apps.binaries.models import BinaryInfo
from tubemerger.apps.binaries.services.locator_service import BinaryLocatorService
from tubemerger.apps.binaries.services.installer_service import BinaryInstallerService
from tubemerger.apps.binaries.services.inspector_service import BinaryInspectorService

class BinaryService:
    def __init__(self, binaries_dir: Optional[Path] = None):
        self.locator = BinaryLocatorService(binaries_dir)
        self.installer = BinaryInstallerService(binaries_dir)
        self.inspector = BinaryInspectorService()

    def get_ffmpeg_path(self) -> str:
        return self.locator.find_ffmpeg()

    def get_ffprobe_path(self) -> str:
        return self.locator.find_ffprobe()

    def get_ytdlp_path(self) -> str:
        return self.locator.find_ytdlp()

    def get_ffmpeg_version(self, path: Optional[str] = None) -> Optional[str]:
        target = path or self.get_ffmpeg_path()
        return self.inspector.get_ffmpeg_version(target)

    def get_ytdlp_version(self, path: Optional[str] = None) -> Optional[str]:
        target = path or self.get_ytdlp_path()
        return self.inspector.get_ytdlp_version(target)

    def check_all(self) -> Dict[str, BinaryInfo]:
        results: Dict[str, BinaryInfo] = {}

        try:
            p = self.get_ffmpeg_path()
            v = self.get_ffmpeg_version(p)
            results["ffmpeg"] = BinaryInfo(name="ffmpeg", status="ok", path=p, version=v)
        except Exception:
            results["ffmpeg"] = BinaryInfo(name="ffmpeg", status="missing")

        try:
            p = self.get_ytdlp_path()
            v = self.get_ytdlp_version(p)
            results["ytdlp"] = BinaryInfo(name="yt-dlp", status="ok", path=p, version=v)
        except Exception:
            results["ytdlp"] = BinaryInfo(name="yt-dlp", status="missing")

        return results

    def download_ytdlp(self) -> str:
        return self.installer.download_ytdlp()

    def download_ffmpeg(self) -> Tuple[str, str]:
        return self.installer.download_ffmpeg()

__all__ = [
    "BinaryService",
    "BinaryLocatorService",
    "BinaryInstallerService",
    "BinaryInspectorService",
]
