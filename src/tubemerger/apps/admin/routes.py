"""FastAPI Router for TubeMerge Administrator Subsystem."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from tubemerger.apps.admin.security import require_admin
from tubemerger.apps.admin.schemas import (
    AdminStatsResponse,
    AdminUserItem,
    UpdateUserTierRequest,
    GenerateKeyRequest,
    AdminLicenseItem,
    AdminUsageEvent,
)
from tubemerger.apps.admin.services import AdminService

router = APIRouter(prefix="/api/admin", tags=["Admin Subsystem"])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(admin_user: dict = Depends(require_admin)):
    """Retrieve global system health, metrics, and billing indicators."""
    stats = AdminService.get_overview_stats()
    return AdminStatsResponse(**stats)

@router.get("/users", response_model=List[AdminUserItem])
def list_creators(
    search: Optional[str] = Query(None),
    admin_user: dict = Depends(require_admin),
):
    """List all registered users, their tiers, roles, and merge counts."""
    users = AdminService.list_users(search)
    return [AdminUserItem(**u) for u in users]

@router.post("/users/{user_id}/tier")
def update_user_tier(
    user_id: str,
    payload: UpdateUserTierRequest,
    admin_user: dict = Depends(require_admin),
):
    """Change a user's subscription tier or promote/demote their role."""
    success = AdminService.update_user_tier(user_id, payload.tier, payload.role)
    return {"status": "success", "user_id": user_id, "tier": payload.tier, "role": payload.role}

@router.post("/users/{user_id}/reset-devices")
def reset_user_devices(
    user_id: str,
    admin_user: dict = Depends(require_admin),
):
    """Clear all bound hardware slots for a creator so they can re-link machines."""
    cleared = AdminService.reset_user_devices(user_id)
    return {"status": "success", "user_id": user_id, "cleared_slots": cleared}

@router.get("/licenses", response_model=List[AdminLicenseItem])
def list_licenses(admin_user: dict = Depends(require_admin)):
    """List all master and user product keys with active machine allocations."""
    licenses = AdminService.list_licenses()
    return [AdminLicenseItem(**lic) for lic in licenses]

@router.post("/licenses/generate", response_model=AdminLicenseItem)
def generate_license(
    payload: GenerateKeyRequest,
    admin_user: dict = Depends(require_admin),
):
    """Generate and issue a new cryptographically signed product key."""
    new_lic = AdminService.generate_license_key(
        tier=payload.tier,
        max_devices=payload.max_devices,
        user_email=payload.user_email,
        notes=payload.notes,
    )
    return AdminLicenseItem(**new_lic)

@router.post("/licenses/{license_key}/revoke")
def revoke_license(
    license_key: str,
    admin_user: dict = Depends(require_admin),
):
    """Revoke an active product key."""
    revoked = AdminService.revoke_license(license_key)
    if not revoked:
        raise HTTPException(status_code=404, detail="License key not found.")
    return {"status": "success", "license_key": license_key, "action": "revoked"}

@router.get("/audit-log", response_model=List[AdminUsageEvent])
def get_billing_audit_log(
    limit: int = Query(50, ge=1, le=500),
    admin_user: dict = Depends(require_admin),
):
    """Stream live user requests from Supabase for metered billing and auditing."""
    logs = AdminService.list_billing_audit_log(limit)
    return [AdminUsageEvent(**log) for log in logs]
