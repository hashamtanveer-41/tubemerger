"""Pydantic schemas for TubeMerge Administrator Subsystem."""

from typing import Optional, List
from pydantic import BaseModel, Field

class AdminStatsResponse(BaseModel):
    total_users: int
    active_licenses: int
    total_merges: int
    total_minutes_processed: int
    active_workstations: int

class AdminUserItem(BaseModel):
    id: str
    email: str
    full_name: str
    handle: str
    tier: str
    role: str
    created_at: str
    merge_count: int = 0
    active_devices_count: int = 0

class UpdateUserTierRequest(BaseModel):
    tier: str = Field(..., description="Target tier: COMMUNITY, CREATOR_PRO, or LIFETIME")
    role: Optional[str] = Field(None, description="Target role: user or admin")

class GenerateKeyRequest(BaseModel):
    tier: str = Field("CREATOR_PRO", description="Target tier: CREATOR_PRO or LIFETIME")
    max_devices: int = Field(2, ge=1, le=100)
    user_email: Optional[str] = Field(None, description="Optional email to bind directly")
    notes: Optional[str] = None

class AdminLicenseItem(BaseModel):
    id: int
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    license_key: str
    tier: str
    status: str
    max_devices: int
    active_devices_count: int = 0
    created_at: str

class AdminUsageEvent(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    hardware_id: Optional[str] = None
    request_type: str
    video_count: int
    duration_seconds: int
    status: str
    created_at: str
