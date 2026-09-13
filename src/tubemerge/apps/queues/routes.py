"""API routes for Merge Queues."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tubemerge.apps.queues.services import QueueService

router = APIRouter(prefix="/api/queues", tags=["Merge Queues"])

class EnqueueRequest(BaseModel):
    playlist_url: str
    playlist_title: Optional[str] = "Queued Playlist"
    channel_name: Optional[str] = "YouTube Creator"
    video_count: Optional[int] = 0
    canvas_preset: Optional[str] = "auto"
    crf: Optional[int] = 21

@router.get("", response_model=List[Dict[str, Any]])
def list_queue():
    return QueueService.get_all_queued()

@router.post("", response_model=Dict[str, Any])
def add_to_queue(payload: EnqueueRequest):
    url_lower = (payload.playlist_url or "").lower().strip()
    if "spotify.com" in url_lower:
        raise HTTPException(
            status_code=422,
            detail={"error": "Spotify playlists cannot be queued because Spotify audio streams are DRM-protected. Please queue YouTube links.", "title": "Spotify Not Supported"}
        )
    if "music.apple.com" in url_lower or "itunes.apple.com" in url_lower:
        raise HTTPException(
            status_code=422,
            detail={"error": "Apple Music playlists cannot be queued because streams are DRM-protected. Please queue YouTube links.", "title": "Apple Music Not Supported"}
        )
    return QueueService.enqueue(
        playlist_url=payload.playlist_url,
        playlist_title=payload.playlist_title,
        channel_name=payload.channel_name,
        video_count=payload.video_count or 0,
        canvas_preset=payload.canvas_preset or "auto",
        crf=payload.crf or 21,
    )

@router.delete("/{queue_id}")
def delete_queue_item(queue_id: int):
    success = QueueService.remove(queue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Queued item not found.")
    return {"status": "deleted", "id": queue_id}
