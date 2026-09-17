"""Pydantic schemas for merge operations."""

from typing import List, Optional
from pydantic import BaseModel


class StartMergeRequest(BaseModel):
    url: str
    selected_indices: List[int]
    output_dir: Optional[str] = None
    output_filename: Optional[str] = None
    canvas_preset: Optional[str] = "auto"
    quality: Optional[str] = None
    crf: Optional[int] = 21
    merge_videos: Optional[bool] = True
    format: Optional[str] = "mp4"
    estimated_size_mb: Optional[float] = None


class StartMergeResponse(BaseModel):
    status: str
    job_id: str
    message: Optional[str] = None
    # True when MONETIZATION_ACTIVE and the system browser was opened
    browser_opened: bool = False


class CancelResponse(BaseModel):
    status: str
    message: str


class PauseResponse(BaseModel):
    status: str
    message: str


class ResumeResponse(BaseModel):
    status: str
    message: str
