"""Domain models and enums for video processing."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional, List

class PipelineStatus(str, Enum):
    IDLE = "idle"
    FETCHING = "fetching"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    NORMALIZING = "normalizing"
    STITCHING = "stitching"
    EMBEDDING_CHAPTERS = "embedding_chapters"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"

@dataclass
class ProgressSnapshot:
    """Atomic state update emitted across the pipeline."""
    status: PipelineStatus
    current_item: int = 0
    total_items: int = 0
    current_video_title: str = ""
    overall_percent: float = 0.0
    message: str = ""
    speed: Optional[str] = None
    eta: Optional[str] = None
    output_file: Optional[str] = None
    error: Optional[str] = None

@dataclass
class MergeJobSpecification:
    """Parameters defining a complete merge job."""
    playlist_url: str
    selected_indices: List[int]
    output_dir: Optional[str] = None
    output_filename: Optional[str] = None
    canvas_preset: str = "auto"
    quality: Optional[str] = "1080p"
    crf: int = 21
    merge_videos: bool = True
    media_format: str = "mp4"
