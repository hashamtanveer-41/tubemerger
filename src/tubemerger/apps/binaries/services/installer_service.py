import os
import sys
import time
import stat
import platform
import tarfile
import zipfile
import threading
import logging
import urllib.request
from pathlib import Path
from typing import Optional, Tuple
from tubemerger.core import settings

logger = logging.getLogger(__name__)

_UPDATING_LOCK = threading.Lock()
_LAST_UPDATE_TIME = 0.0

class BinaryInstallerService:
    def __init__(self, binaries_dir: Optional[Path] = None):
        self.binaries_dir = binaries_dir or settings.BINARIES_DIR
        self.binaries_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def trigger_background_ytdlp_update(cls) -> None:
        """Spawn background daemon thread to fetch latest yt-dlp binary if not already running."""
        def _bg_update():
            global _LAST_UPDATE_TIME
            if not _UPDATING_LOCK.acquire(blocking=False):
                return
            try:
                now = time.time()
                if now - _LAST_UPDATE_TIME < 300:  # 5-minute cooldown
                    return
                logger.info("Triggering self-healing yt-dlp background update from GitHub...")
                installer = cls()
                installer.download_ytdlp()
                _LAST_UPDATE_TIME = now
                logger.info("Self-healing yt-dlp update completed successfully.")
            except Exception as e:
                logger.warning("Background yt-dlp update attempt failed: %s", e)
            finally:
                _UPDATING_LOCK.release()

        t = threading.Thread(target=_bg_update, daemon=True)
        t.start()

    def download_ytdlp(self) -> str:
        if sys.platform == "win32":
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
            dest = self.binaries_dir / "yt-dlp.exe"
        elif sys.platform == "darwin":
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
            dest = self.binaries_dir / "yt-dlp"
        else:
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
            dest = self.binaries_dir / "yt-dlp"

        # Download to a temporary file first then atomically replace to avoid corrupting running processes
        temp_dest = dest.with_suffix(dest.suffix + ".tmp")
        urllib.request.urlretrieve(url, temp_dest)
        if sys.platform != "win32":
            temp_dest.chmod(temp_dest.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        if sys.platform == "darwin":
            try:
                import subprocess
                subprocess.run(["xattr", "-d", "com.apple.quarantine", str(temp_dest)], capture_output=True)
            except Exception:
                pass
        temp_dest.replace(dest)
        return str(dest)

    def download_ffmpeg(self) -> Tuple[str, str]:
        if sys.platform == "win32":
            zip_url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
            zip_dest = self.binaries_dir / "ffmpeg.zip"
            urllib.request.urlretrieve(zip_url, zip_dest)

            with zipfile.ZipFile(zip_dest, "r") as zf:
                for member in zf.namelist():
                    if member.endswith("ffmpeg.exe"):
                        with zf.open(member) as source, open(self.binaries_dir / "ffmpeg.exe", "wb") as target:
                            target.write(source.read())
                    elif member.endswith("ffprobe.exe"):
                        with zf.open(member) as source, open(self.binaries_dir / "ffprobe.exe", "wb") as target:
                            target.write(source.read())

            zip_dest.unlink(missing_ok=True)
            return str(self.binaries_dir / "ffmpeg.exe"), str(self.binaries_dir / "ffprobe.exe")

        elif sys.platform == "darwin":
            # macOS static Mach-O build from eugeneware/ffmpeg-static
            arch = platform.machine().lower()
            tag = "arm64" if ("arm" in arch or "aarch64" in arch) else "x64"
            ffmpeg_url = f"https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-{tag}"
            ffprobe_url = f"https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffprobe-darwin-{tag}"

            ffmpeg_path = self.binaries_dir / "ffmpeg"
            ffprobe_path = self.binaries_dir / "ffprobe"

            urllib.request.urlretrieve(ffmpeg_url, ffmpeg_path)
            urllib.request.urlretrieve(ffprobe_url, ffprobe_path)

            ffmpeg_path.chmod(ffmpeg_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            ffprobe_path.chmod(ffprobe_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            try:
                import subprocess
                subprocess.run(["xattr", "-d", "com.apple.quarantine", str(ffmpeg_path)], capture_output=True)
                subprocess.run(["xattr", "-d", "com.apple.quarantine", str(ffprobe_path)], capture_output=True)
            except Exception:
                pass
            return str(ffmpeg_path), str(ffprobe_path)


        else:
            # Linux static build
            tar_url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
            tar_dest = self.binaries_dir / "ffmpeg.tar.xz"
            urllib.request.urlretrieve(tar_url, tar_dest)

            with tarfile.open(tar_dest, "r:xz") as tar:
                for member in tar.getmembers():
                    if member.name.endswith("/ffmpeg") or member.name == "ffmpeg":
                        member.name = "ffmpeg"
                        tar.extract(member, path=self.binaries_dir)
                    elif member.name.endswith("/ffprobe") or member.name == "ffprobe":
                        member.name = "ffprobe"
                        tar.extract(member, path=self.binaries_dir)

            tar_dest.unlink(missing_ok=True)
            ffmpeg_path = self.binaries_dir / "ffmpeg"
            ffprobe_path = self.binaries_dir / "ffprobe"

            ffmpeg_path.chmod(ffmpeg_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            ffprobe_path.chmod(ffprobe_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

            return str(ffmpeg_path), str(ffprobe_path)
