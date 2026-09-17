"""Zero-DB Cloud Client for Distributed Workstations.

Allows desktop installations to perform authentication, license checks,
and metered usage recording over pure HTTPS without holding any database
credentials or opening PostgreSQL connections directly.
"""

import os
import logging
from typing import Dict, Any, Optional
import httpx

from tubemerger.core import settings

logger = logging.getLogger(__name__)

class CloudClient:
    """Pure HTTPS client communicating with the centralized TubeMerge Cloud API."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or os.environ.get("TUBEMERGE_CLOUD_API_URL") or settings.SERVER_URL).rstrip("/")
        self.timeout = httpx.Timeout(15.0, connect=5.0)

    def _headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def register(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        """Registers a new creator account via Cloud API."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(
                f"{self.base_url}/api/auth/register",
                headers=self._headers(),
                json={"email": email, "password": password, "full_name": full_name},
            )
            res.raise_for_status()
            return res.json()

    def login(self, email: str, password: str, device_name: str = "Workstation") -> Dict[str, Any]:
        """Authenticates creator and retrieves session token + license info."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(
                f"{self.base_url}/api/auth/login",
                headers=self._headers(),
                json={"email": email, "password": password, "device_name": device_name},
            )
            res.raise_for_status()
            return res.json()

    def get_me(self, token: str) -> Dict[str, Any]:
        """Fetches active user profile and active device slots."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.get(
                f"{self.base_url}/api/auth/me",
                headers=self._headers(token),
            )
            res.raise_for_status()
            return res.json()

    def record_usage(
        self,
        token: Optional[str],
        hardware_id: str,
        video_count: int,
        duration_seconds: int,
    ) -> None:
        """Records a billable merge request over HTTPS."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                client.post(
                    f"{self.base_url}/api/billing/record-request",
                    headers=self._headers(token),
                    json={
                        "hardware_id": hardware_id,
                        "video_count": video_count,
                        "duration_seconds": duration_seconds,
                    },
                )
        except Exception as exc:
            logger.warning("Failed to record usage over Cloud API: %s", exc)

    def get_usage(self, token: Optional[str] = None) -> Dict[str, Any]:
        """Fetches metered quota and lifetime merge stats over HTTPS."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.get(
                f"{self.base_url}/api/account/usage",
                headers=self._headers(token),
            )
            res.raise_for_status()
            return res.json()
