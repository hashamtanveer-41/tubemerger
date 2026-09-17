"""API routes for update checking and app lifecycle."""

import sys
import threading

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from tubemerger.apps.updates.service import check_for_updates, check_connectivity

router = APIRouter(prefix="/api", tags=["updates"])


@router.get("/updates/check")
async def updates_check():
    """Return connectivity status + update-check payload."""
    online = check_connectivity(timeout=4.0)
    if not online:
        return JSONResponse(
            {
                "online": False,
                "update_info": None,
            }
        )

    info = check_for_updates()
    return JSONResponse({"online": True, "update_info": info})


@router.get("/updates/connectivity")
async def connectivity_check():
    """Lightweight connectivity ping (used by the No-Internet modal Try Again)."""
    online = check_connectivity(timeout=4.0)
    return JSONResponse({"online": online})


@router.post("/system/quit")
async def quit_app():
    """Gracefully exit the desktop process from the frontend."""

    def _exit():
        import time
        time.sleep(0.3)   # let the response body reach the client
        sys.exit(0)

    t = threading.Thread(target=_exit, daemon=True)
    t.start()
    return JSONResponse({"status": "exiting"})
