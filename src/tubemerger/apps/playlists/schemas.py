"""Pydantic schemas for playlist endpoints."""

from typing import List, Optional
from pydantic import BaseModel

class VideoClipSchema(BaseModel):
    id: str
    title: str
    url: str
    duration_seconds: int
    duration_formatted: str
    duration: str  # alias for backward compatibility
    thumbnail_url: Optional[str] = None
    thumbnail: Optional[str] = None  # alias
    width: int
    height: int
    fps: float
    resolution_label: str

class FetchPlaylistRequest(BaseModel):
    url: str

class FetchPlaylistResponse(BaseModel):
    playlist_id: str
    title: str
    channel: str
    webpage_url: str
    total_duration_seconds: int
    total_duration_formatted: str
    total_duration: str  # alias
    thumbnail: Optional[str] = None
    video_count: int
    estimated_size_mb: Optional[float] = None
    estimated_size_formatted: Optional[str] = None
    entries: List[VideoClipSchema]
    videos: List[VideoClipSchema]  # alias
