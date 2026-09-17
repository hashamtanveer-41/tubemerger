"""FastAPI routes for Supabase Cloud Authentication."""

from fastapi import APIRouter, Header, HTTPException
from typing import Optional

from tubemerger.apps.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    DeactivateDeviceRequest,
)
from tubemerger.apps.auth.services import AuthService

router = APIRouter(prefix="/api/auth", tags=["Supabase Cloud Authentication"])

def _extract_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract token from 'Authorization: Bearer <token>' header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization

@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest):
    """Register a new account in Supabase PostgreSQL and bind the workstation."""
    return AuthService.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    """Sign in to Supabase, enforce 2-device node-lock, and issue offline Ed25519 token."""
    return AuthService.login(
        email=payload.email,
        password=payload.password,
        device_name=payload.device_name or "Workstation",
    )

@router.get("/me", response_model=AuthResponse)
def get_current_user(authorization: Optional[str] = Header(None)):
    """Retrieve current authenticated user profile and active device slots."""
    token = _extract_token(authorization)
    return AuthService.get_current_user(token)

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Revoke session token in Supabase cloud."""
    token = _extract_token(authorization)
    AuthService.logout(token)
    return {"status": "success", "message": "Successfully logged out."}

@router.post("/deactivate-device", response_model=AuthResponse)
def deactivate_device(payload: DeactivateDeviceRequest, authorization: Optional[str] = Header(None)):
    """Deactivate a workstation hardware slot to free it for another machine."""
    token = _extract_token(authorization)
    return AuthService.deactivate_device(token, payload.hardware_id)
