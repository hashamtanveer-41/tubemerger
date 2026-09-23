"""Embedded FastAPI/Uvicorn server runner and readiness probing."""

import time
import urllib.request
import uvicorn

from tubemerger.core import settings
from tubemerger.server.app import create_app


def start_server(port: int) -> None:
    """Run uvicorn server in a blocking loop (intended for a daemon thread)."""
    app = create_app()
    config = uvicorn.Config(
        app=app,
        host=settings.HOST,
        port=port,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    server.run()


def wait_for_server(timeout: float = 12.0) -> bool:
    """Poll the backend /api/ping endpoint until it responds or timeout is reached."""
    deadline = time.time() + timeout
    # Explicitly bypass any system/env proxies for local readiness check
    direct_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.time() < deadline:
        try:
            with direct_opener.open(f"{settings.SERVER_URL}/api/ping", timeout=0.5) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.1)
    return False
