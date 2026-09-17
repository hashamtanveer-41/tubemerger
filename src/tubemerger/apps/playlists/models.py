"""Domain entities for playlists and video clips."""

from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class VideoClip:
    """Represents a single video clip inside a playlist."""
    id: str
    title: str
    url: str
    duration_seconds: int = 0
    thumbnail_url: Optional[str] = None
    width: int = 0
    height: int = 0
    fps: float = 0.0

    @property
    def duration_formatted(self) -> str:
        """Format duration as 'Xm Ys' or 'Xh Ym'."""
        s = self.duration_seconds
        if s <= 0:
            return "--:--"
        hours = s // 3600
        mins = (s % 3600) // 60
        secs = s % 60
        if hours > 0:
            return f"{hours}h {mins:02d}m"
        return f"{mins}m {secs:02d}s"

    @property
    def resolution_label(self) -> str:
        """Resolution tag for UI badge."""
        if self.height >= 2160:
            return "4K"
        if self.height >= 1080:
            return "1080p"
        if self.height >= 720:
            return "720p"
        if self.height > 0:
            return "SD"
        return "HD"

@dataclass
class Playlist:
    """Represents a full YouTube playlist with aggregated metadata."""
    playlist_id: str
    title: str
    channel: str
    webpage_url: str
    entries: List[VideoClip] = field(default_factory=list)
    thumbnail: Optional[str] = None

    @property
    def total_duration_seconds(self) -> int:
        return sum(clip.duration_seconds for clip in self.entries)

    @property
    def total_duration_formatted(self) -> str:
        s = self.total_duration_seconds
        hours = s // 3600
        mins = (s % 3600) // 60
        if hours > 0:
            return f"{hours}h {mins:02d}m"
        return f"{mins}m {s % 60:02d}s"

    @property
    def video_count(self) -> int:
        return len(self.entries)
