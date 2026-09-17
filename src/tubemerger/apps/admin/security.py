"""Role-Based Access Control (RBAC) Guards for Admin API."""

from typing import Optional, Dict, Any
from fastapi import Header, HTTPException
from tubemerger.apps.auth.services import AuthService

def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency that verifies the current user has the 'admin' role in Supabase.
    
    Raises:
        HTTPException 401 if token is missing or expired.
        HTTPException 403 if user is not an administrator.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required to access Admin Console."
        )

    parts = authorization.split(" ")
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization

    try:
        user_data = AuthService.get_current_user(token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session: {str(exc)}")

    user = user_data.get("user", {})
    role = user.get("role", "user")

    if role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Administrator role required for this action."
        )

    return user_data
