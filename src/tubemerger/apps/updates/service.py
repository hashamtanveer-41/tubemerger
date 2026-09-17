"""Update checking service — uses only stdlib (no third-party deps).

Startup sequence:
  1. check_connectivity()  →  is the machine connected to the internet?
  2. check_for_updates()   →  is a newer (or forced) release available?

Force-update triggers:
  - Major version bump: new_major > current_major
  - Release name or body contains the token [MANDATORY] or [BREAKING]
"""

import json
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from typing import Optional

from tubemerger.core import settings

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GITHUB_API_URL = (
    "https://api.github.com/repos/hashamtanveer-41/tubemerger/releases/latest"
)
WEBSITE_DOWNLOAD_URL = "https://tubemerger.com/download"
WEBSITE_VERSION_MANIFEST_URL = "https://tubemerger.com/version.json"

# OS-specific canonical asset filenames (served via GitHub releases/latest)
_ASSET_MAP = {
    "win32": "TubeMerge-Setup.exe",
    "darwin": "TubeMerge-macOS-x64.zip",
    "linux": "TubeMerge-Linux-x64.tar.gz",
}

GITHUB_RELEASES_BASE = (
    "https://github.com/hashamtanveer-41/tubemerger/releases/latest/download"
)

# Simple in-process cache to avoid hammering the API more than once per hour
_cache: dict = {"data": None, "ts": 0.0}
_CACHE_TTL = 3600  # seconds


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_ssl_context(verify: bool = True) -> Optional[ssl.SSLContext]:
    """Provide a resilient SSL context, handling environments without system certs."""
    if not verify:
        try:
            return ssl._create_unverified_context()
        except AttributeError:
            pass
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    try:
        return ssl.create_default_context()
    except Exception:
        try:
            return ssl._create_unverified_context()
        except AttributeError:
            return None


def _parse_semver(tag: str) -> tuple[int, int, int]:
    """Parse a 'v1.2.3' or '1.2.3' tag into a (major, minor, patch) tuple."""
    tag = tag.lstrip("vV").strip()
    parts = tag.split(".")
    try:
        major = int(parts[0]) if len(parts) > 0 else 0
        minor = int(parts[1]) if len(parts) > 1 else 0
        patch = int(parts[2].split("-")[0]) if len(parts) > 2 else 0
    except (ValueError, IndexError):
        major = minor = patch = 0
    return major, minor, patch


def _is_mandatory_release(name: str, body: str) -> bool:
    """Check if release notes flag this as a forced/breaking update."""
    combined = (name or "").upper() + " " + (body or "").upper()
    return "[MANDATORY]" in combined or "[BREAKING]" in combined


def _direct_download_url() -> str:
    asset = _ASSET_MAP.get(sys.platform, "TubeMerge-Linux-x64.tar.gz")
    return f"{GITHUB_RELEASES_BASE}/{asset}"


def _fetch_json(url: str, timeout: float = 4.0) -> Optional[dict]:
    """Safely fetch JSON from a URL with robust SSL handling and error suppression."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": f"TubeMerger/{settings.VERSION}",
            "Accept": "application/vnd.github+json, application/json",
        },
    )
    ssl_ctx = _get_ssl_context(verify=False)
    kw = {"context": ssl_ctx} if ssl_ctx else {}
    try:
        with urllib.request.urlopen(req, timeout=timeout, **kw) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check_connectivity(timeout: float = 3.0) -> bool:
    """Return True if active internet connectivity is present.

    Uses a fast multi-tiered approach:
    1. Direct TCP socket to public DNS resolvers (1.1.1.1, 8.8.8.8) on port 53.
       Fastest (~20ms), tests raw IP routing with zero SSL or HTTP dependencies.
    2. Plain HTTP captive portal probes (Windows msftconnecttest, Google 204).
       Immune to missing Windows CA certificates in PyInstaller packages.
    3. HTTPS probes with unverified SSL fallback (GitHub API, YouTube).
    """
    # Tier 1: Direct TCP socket to public DNS (no SSL/DNS dependencies)
    for ip in ("1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"):
        try:
            sock = socket.create_connection((ip, 53), timeout=1.5)
            sock.close()
            return True
        except (OSError, socket.error):
            pass

    # Tier 2: Plain HTTP captive portal probes (standard OS checks, no SSL cert issues)
    http_probes = [
        "http://www.msftconnecttest.com/connecttest.txt",  # Windows OS native probe
        "http://www.google.com/generate_204",             # Google captive portal 204
        "http://1.1.1.1",                                 # Cloudflare
    ]
    for url in http_probes:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": f"TubeMerger/{settings.VERSION}"},
            )
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                return True
        except urllib.error.HTTPError:
            # Any HTTP status response (e.g. 301, 302, 403, 404, 500) proves the host is online!
            return True
        except Exception:
            pass

    # Tier 3: HTTPS probes with resilient SSL context
    ssl_ctx = _get_ssl_context(verify=False)
    kw = {"context": ssl_ctx} if ssl_ctx else {}
    https_probes = [
        "https://api.github.com",
        "https://www.youtube.com",
        "https://tubemerger.com",
    ]
    for url in https_probes:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": f"TubeMerger/{settings.VERSION}"},
            )
            with urllib.request.urlopen(req, timeout=2.5, **kw) as resp:
                return True
        except urllib.error.HTTPError:
            return True
        except Exception:
            pass

    return False


def check_for_updates() -> dict:
    """Return an update-status dict.

    Returns
    -------
    {
        current_version: str,
        latest_version: str,
        update_available: bool,
        is_major: bool,
        is_force_update: bool,
        release_name: str,
        release_notes: str,
        published_at: str,
        download_url: str,
        website_download_url: str,
    }
    """
    base = {
        "current_version": settings.VERSION,
        "latest_version": settings.VERSION,
        "update_available": False,
        "is_major": False,
        "is_force_update": False,
        "release_name": "",
        "release_notes": "",
        "published_at": "",
        "download_url": _direct_download_url(),
        "website_download_url": WEBSITE_DOWNLOAD_URL,
    }

    # Serve from cache if fresh
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["data"]

    # 1. Try GitHub API
    data = _fetch_json(GITHUB_API_URL, timeout=4.0)
    tag = data.get("tag_name", "") if data else ""

    # 2. Fallback to website version.json manifest if GitHub API fails or is rate-limited
    if not tag:
        manifest = _fetch_json(WEBSITE_VERSION_MANIFEST_URL, timeout=3.0)
        if manifest and manifest.get("version"):
            tag = manifest.get("tag", f"v{manifest['version']}")
            data = {
                "tag_name": tag,
                "name": f"TubeMerger v{manifest['version']}",
                "body": "",
                "published_at": manifest.get("updated", ""),
            }

    if not tag:
        return base

    current = _parse_semver(settings.VERSION)
    latest = _parse_semver(tag)

    update_available = latest > current
    is_major = latest[0] > current[0]
    is_mandatory = _is_mandatory_release(
        data.get("name", "") if data else "", data.get("body", "") if data else ""
    )
    is_force_update = is_major or is_mandatory

    result = {
        "current_version": settings.VERSION,
        "latest_version": tag.lstrip("vV"),
        "update_available": update_available,
        "is_major": is_major,
        "is_force_update": is_force_update,
        "release_name": data.get("name", "") if data else "",
        "release_notes": data.get("body", "") if data else "",
        "published_at": data.get("published_at", "") if data else "",
        "download_url": _direct_download_url(),
        "website_download_url": WEBSITE_DOWNLOAD_URL,
    }

    _cache["data"] = result
    _cache["ts"] = now
    return result
