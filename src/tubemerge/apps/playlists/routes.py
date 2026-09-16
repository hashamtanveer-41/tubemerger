from fastapi import APIRouter
from tubemerge.apps.playlists.controllers import PlaylistController
from tubemerge.apps.playlists.schemas import FetchPlaylistRequest, FetchPlaylistResponse
from tubemerge.apps.telemetry.service import TelemetryService

router = APIRouter(prefix="/api", tags=["playlists"])
controller = PlaylistController()

@router.post("/fetch-playlist", response_model=FetchPlaylistResponse)
def fetch_playlist(payload: FetchPlaylistRequest):
    res = controller.fetch_playlist(payload)
    clip_count = len(res.entries) if hasattr(res, "entries") and res.entries else 0
    TelemetryService.track_playlist_inspected(
        clip_count=clip_count,
        playlist_size_mb=getattr(res, "estimated_size_mb", None),
    )
    return res
