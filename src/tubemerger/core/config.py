"""Global feature flags and runtime configuration for TubeMerge.

This is the single authoritative place for toggling monetization phases
and configuring the production web endpoint. All other modules import
their flags from here.
"""

import os
import base64

# ---------------------------------------------------------------------------
# Monetization Phase Toggle
# ---------------------------------------------------------------------------
MONETIZATION_ACTIVE: bool = False

# ---------------------------------------------------------------------------
# Production Web URL
# ---------------------------------------------------------------------------
PRODUCTION_WEB_URL: str = "https://tubemerger.com"

# ---------------------------------------------------------------------------
# Privacy-Preserving Telemetry (Encrypted Ingestion Token)
# ---------------------------------------------------------------------------
# The Aptabase ingestion key is a publishable, write-only telemetry token (it
# has zero read/admin access). To prevent automated crawlers and bots from
# scraping the token from the open source repository, it is stored encrypted
# and de-obfuscated in-memory at runtime.
_SALT = b"TubeMerger2026TelemetryGuard"
_ENC_KEY = "FVgnMGBUQlFWRwsEBA9j"

def _resolve_telemetry_key() -> str:
    override = os.environ.get("APTABASE_KEY")
    if override:
        return override.strip()
    try:
        raw = base64.b64decode(_ENC_KEY.encode("utf-8"))
        return bytes(b ^ _SALT[i % len(_SALT)] for i, b in enumerate(raw)).decode("utf-8")
    except Exception:
        return ""

TELEMETRY_APP_KEY: str = _resolve_telemetry_key()
TELEMETRY_HOST: str = "https://eu.aptabase.com"  # EU data residency

# ---------------------------------------------------------------------------
# Clip-count bucketing for telemetry (prevents recording exact values)
# ---------------------------------------------------------------------------
TELEMETRY_SMALL_THRESHOLD: int = 20
