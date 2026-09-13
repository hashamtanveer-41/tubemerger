"""API router for host desktop OS integration."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from tubemerge.apps.system.services import SystemService

router = APIRouter(prefix="/api", tags=["system"])
system_service = SystemService()

class PathPayload(BaseModel):
    path: str

@router.post("/open-file")
def open_file(payload: PathPayload):
    """Launch file in native default media player."""
    ok = system_service.open_file(payload.path)
    if not ok:
        raise HTTPException(status_code=404, detail="File could not be opened or does not exist.")
    return {"status": "ok", "message": "Opened file successfully."}

@router.post("/open-folder")
def open_folder(payload: PathPayload):
    """Open folder in native file manager."""
    ok = system_service.open_folder(payload.path)
    if not ok:
        raise HTTPException(status_code=404, detail="Folder could not be opened or does not exist.")
    return {"status": "ok", "message": "Opened folder successfully."}

class UrlPayload(BaseModel):
    url: str

@router.post("/open-url")
def open_url(payload: UrlPayload):
    """Launch external URL in default desktop browser."""
    ok = system_service.open_url(payload.url)
    if not ok:
        raise HTTPException(status_code=400, detail="URL could not be opened.")
    return {"status": "ok", "message": "Opened URL successfully."}

@router.get("/settings")
def get_settings():
    """Retrieve persistent desktop user settings and tour state."""
    return system_service.get_settings()

@router.post("/settings")
def update_settings(payload: dict):
    """Save persistent desktop user settings and tour state."""
    return system_service.update_settings(payload)


