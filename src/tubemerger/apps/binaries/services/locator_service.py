import os
import sys
import shutil
import stat
from pathlib import Path
from typing import Optional
from tubemerger.core import settings

def _unquarantine(path: Path) -> Path:
    """Strip Gatekeeper quarantine attribute on macOS to prevent popups / SIGKILL."""
    if sys.platform == "darwin" and path.is_file():
        try:
            import subprocess
            subprocess.run(["xattr", "-d", "com.apple.quarantine", str(path)], capture_output=True)
        except Exception:
            pass
    return path

class BinaryLocatorService:
    def __init__(self, binaries_dir: Optional[Path] = None):
        self.binaries_dir = binaries_dir or settings.BINARIES_DIR
        self.binaries_dir.mkdir(parents=True, exist_ok=True)


    def which(self, name: str) -> Optional[Path]:
        names = [name]
        if sys.platform == "win32" and not name.endswith(".exe"):
            names = [f"{name}.exe", name]

        for n in names:
            # 1. Bundled in user app data binaries dir (~/.tubemerger/bin)
            bundled = self.binaries_dir / n
            if bundled.is_file():
                # Clean up legacy broken dummy wrapper scripts (< 1KB)
                if n.startswith("yt-dlp") and bundled.stat().st_size < 1024:
                    try:
                        bundled.unlink(missing_ok=True)
                    except Exception:
                        pass
                elif sys.platform == "win32" or os.access(bundled, os.X_OK):
                    return _unquarantine(bundled)

            # 2. Bundled inside application installation directory
            # Windows: C:\Program Files\TubeMerge\bin
            # macOS: TubeMerge.app/Contents/MacOS/bin or TubeMerge.app/Contents/Resources/bin
            if getattr(sys, "frozen", False):
                app_dir = Path(sys.executable).parent
            else:
                app_dir = Path(__file__).resolve().parents[4]

            candidates = [
                app_dir / n,
                app_dir / "bin" / n,
                app_dir.parent / "Resources" / n,
                app_dir.parent / "Resources" / "bin" / n,
            ]
            for candidate in candidates:
                if candidate.is_file() and (sys.platform == "win32" or os.access(candidate, os.X_OK)):
                    return _unquarantine(candidate)

            # 3. macOS Homebrew & MacPorts paths (when launched from Finder without shell PATH)
            if sys.platform == "darwin":
                mac_candidates = [
                    Path("/opt/homebrew/bin") / n,      # Apple Silicon Homebrew (M1/M2/M3/M4)
                    Path("/usr/local/bin") / n,         # Intel Homebrew
                    Path("/opt/local/bin") / n,         # MacPorts
                ]
                for mac_p in mac_candidates:
                    if mac_p.is_file() and os.access(mac_p, os.X_OK):
                        return _unquarantine(mac_p)

            # 4. User local bin (~/.local/bin)
            local_bin = Path.home() / ".local" / "bin" / n
            if local_bin.is_file() and (sys.platform == "win32" or os.access(local_bin, os.X_OK)):
                return _unquarantine(local_bin)

            # 5. System PATH via shutil.which
            found = shutil.which(n)
            if found:
                return _unquarantine(Path(found))


        return None

    def find_ffmpeg(self) -> str:
        path = self.which("ffmpeg")
        if not path:
            raise FileNotFoundError("FFmpeg executable not found. Please click 'Install Binaries' in Settings.")
        return str(path)

    def find_ffprobe(self) -> str:
        path = self.which("ffprobe")
        if not path:
            raise FileNotFoundError("FFprobe executable not found. Please click 'Install Binaries' in Settings.")
        return str(path)

    def find_ytdlp(self) -> str:
        path = self.which("yt-dlp")
        if path:
            return str(path)

        # If missing, attempt automatic download of the official standalone release binary
        try:
            from tubemerger.apps.binaries.services.installer_service import BinaryInstallerService
            installer = BinaryInstallerService(self.binaries_dir)
            downloaded = installer.download_ytdlp()
            if downloaded and Path(downloaded).is_file():
                return str(downloaded)
        except Exception:
            pass

        raise FileNotFoundError("yt-dlp executable not found. Please click 'Install Binaries' in Settings.")

