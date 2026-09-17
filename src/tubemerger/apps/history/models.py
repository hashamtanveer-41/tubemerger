"""Data models for Merge History."""

from dataclasses import dataclass
from typing import Optional

@dataclass
class HistoryEntry:
    id: int
    job_id: str
    playlist_title: str
    playlist_url: str
    channel_name: Optional[str]
    video_count: int
    duration_seconds: int
    duration_formatted: str
    resolution: str
    output_path: str
    file_size_bytes: int
    file_size_formatted: str
    status: str
    created_at: str
    file_exists: bool
