"""Pydantic schemas for authentication and profile management."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, description="Creator email address")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, description="Creator name or channel title")

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, description="Creator email address")
    password: str
    device_name: Optional[str] = "Workstation"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    handle: str
    avatar_url: Optional[str] = None
    tier: str
    role: Optional[str] = "user"
    created_at: str

class ActiveDevice(BaseModel):
    hardware_id: str
    device_name: str
    activated_at: str
    is_current: bool = False

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    plan_tier: str
    max_devices: int
    active_devices: List[ActiveDevice]

class DeactivateDeviceRequest(BaseModel):
    hardware_id: str
