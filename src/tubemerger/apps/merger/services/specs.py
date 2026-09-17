"""Domain models and data transfer objects for the merge pipeline."""

from enum import Enum
from typing import List, Optional
from dataclasses import dataclass
from tubemerger.core import settings


class PipelineStatus(str, Enum):
    IDLE = "idle"
    FETCHING = "fetching"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    NORMALIZING = "normalizing"
    STITCHING = "stitching"
    EMBEDDING_CHAPTERS = "embedding_chapters"
    DONE = "done"
    CANCELLED = "cancelled"
    ERROR = "error"


@dataclass
class MergeJobSpec:
    playlist_url: str
    selected_indices: List[int]
    output_filename: str = "merged_output.mp4"
    canvas_preset: str = "auto"
    quality: str = "1080p"
    crf: int = settings.DEFAULT_CRF
    merge_videos: bool = True
    media_format: str = "mp4"
    estimated_size_mb: Optional[float] = None


@dataclass
class ProgressSnapshot:
    status: PipelineStatus = PipelineStatus.IDLE
    overall_percent: float = 0.0
    current_item: int = 0
    total_items: int = 0
    current_video_title: str = ""
    message: str = ""
    speed: Optional[str] = None
    output_file: Optional[str] = None
    error: Optional[str] = None
    error_subtype: Optional[str] = None
    is_resolvable: bool = False
    playlist_size_mb: Optional[float] = None
