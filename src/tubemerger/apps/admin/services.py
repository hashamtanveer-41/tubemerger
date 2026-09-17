"""Admin Business Logic & Cloud Operations Service."""

import secrets
import logging
from typing import Dict, Any, List, Optional
from tubemerger.apps.auth.db import get_supabase_cursor

logger = logging.getLogger(__name__)

class AdminService:
    @staticmethod
    def get_overview_stats() -> Dict[str, Any]:
        """Calculates global system metrics across Supabase tables."""
        with get_supabase_cursor() as cur:
            # 1. Total users
            cur.execute("SELECT COUNT(*) AS total FROM public.users;")
            row_u = cur.fetchone()
            total_users = row_u["total"] if row_u else 0

            # 2. Active licenses
            cur.execute("SELECT COUNT(*) AS total FROM public.user_licenses WHERE status = 'active';")
            row_l = cur.fetchone()
            active_licenses = row_l["total"] if row_l else 0

            # 3. Total merges & seconds
            cur.execute(
                """
                SELECT COUNT(*) AS total, COALESCE(SUM(duration_seconds), 0) AS total_sec
                FROM public.user_requests
                WHERE request_type = 'merge_job';
                """
            )
            row_m = cur.fetchone()
            total_merges = row_m["total"] if row_m else 0
            total_seconds = row_m["total_sec"] if row_m else 0

            # 4. Active workstations
            cur.execute("SELECT COUNT(*) AS total FROM public.user_devices;")
            row_d = cur.fetchone()
            active_workstations = row_d["total"] if row_d else 0

        return {
            "total_users": total_users,
            "active_licenses": active_licenses,
            "total_merges": total_merges,
            "total_minutes_processed": round(total_seconds / 60),
            "active_workstations": active_workstations,
        }

    @staticmethod
    def list_users(search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists registered creators and users with merge counts."""
        query = """
            SELECT 
                u.id, u.email, u.full_name, u.handle, u.tier, 
                COALESCE(u.role, 'user') as role, u.created_at,
                (SELECT COUNT(*) FROM public.user_requests r WHERE r.user_id = u.id) as merge_count,
                (SELECT COUNT(*) FROM public.user_devices d WHERE d.user_id = u.id) as active_devices_count
            FROM public.users u
        """
        params = []
        if search and search.strip():
            query += " WHERE u.email ILIKE %s OR u.full_name ILIKE %s OR u.handle ILIKE %s"
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        query += " ORDER BY u.created_at DESC LIMIT 100;"

        with get_supabase_cursor() as cur:
            cur.execute(query, tuple(params) if params else None)
            rows = cur.fetchall()

        users = []
        for r in rows:
            created_str = r["created_at"].strftime("%b %d, %Y") if hasattr(r["created_at"], "strftime") else str(r["created_at"])
            users.append({
                "id": str(r["id"]),
                "email": r["email"],
                "full_name": r["full_name"],
                "handle": r["handle"],
                "tier": r["tier"],
                "role": r["role"],
                "created_at": created_str,
                "merge_count": r["merge_count"] or 0,
                "active_devices_count": r["active_devices_count"] or 0,
            })
        return users

    @staticmethod
    def update_user_tier(user_id: str, tier: str, role: Optional[str] = None) -> bool:
        """Updates user plan tier and optionally promotes to admin role."""
        with get_supabase_cursor() as cur:
            if role:
                cur.execute(
                    "UPDATE public.users SET tier = %s, role = %s, updated_at = NOW() WHERE id = %s;",
                    (tier, role, user_id),
                )
            else:
                cur.execute(
                    "UPDATE public.users SET tier = %s, updated_at = NOW() WHERE id = %s;",
                    (tier, user_id),
                )

            # Synchronize license table tier
            max_devs = 100 if tier == "LIFETIME" else (2 if tier in ("PRO", "CREATOR_PRO") else 1)
            cur.execute(
                """
                UPDATE public.user_licenses 
                SET tier = %s, max_devices = %s 
                WHERE user_id = %s;
                """,
                (tier, max_devs, user_id),
            )
        return True

    @staticmethod
    def reset_user_devices(user_id: str) -> int:
        """Clears all bound workstation slots for a user."""
        with get_supabase_cursor() as cur:
            cur.execute("DELETE FROM public.user_devices WHERE user_id = %s;", (user_id,))
            return cur.rowcount

    @staticmethod
    def generate_license_key(
        tier: str = "CREATOR_PRO",
        max_devices: int = 2,
        user_email: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates a signed, unique license key in Supabase."""
        tier_code = "LIFETIME" if tier.upper() == "LIFETIME" else "PRO"
        rand1 = secrets.token_hex(4).upper()
        rand2 = secrets.token_hex(4).upper()
        license_key = f"TM-{tier_code}-{rand1}-{rand2}"

        user_id = None
        with get_supabase_cursor() as cur:
            if user_email:
                cur.execute("SELECT id FROM public.users WHERE email = %s LIMIT 1;", (user_email.strip(),))
                urow = cur.fetchone()
                if urow:
                    user_id = str(urow["id"])

            cur.execute(
                """
                INSERT INTO public.user_licenses 
                (user_id, license_key, tier, max_devices, status)
                VALUES (%s, %s, %s, %s, 'active')
                RETURNING *;
                """,
                (user_id, license_key, tier.upper(), max_devices),
            )
            inserted = cur.fetchone()

        created_str = inserted["created_at"].strftime("%b %d, %Y") if hasattr(inserted["created_at"], "strftime") else "Just now"
        return {
            "id": inserted["id"],
            "user_id": user_id,
            "user_email": user_email,
            "license_key": license_key,
            "tier": tier.upper(),
            "status": "active",
            "max_devices": max_devices,
            "active_devices_count": 0,
            "created_at": created_str,
        }

    @staticmethod
    def list_licenses() -> List[Dict[str, Any]]:
        """Lists all master and user licenses issued."""
        query = """
            SELECT 
                l.id, l.user_id, l.license_key, l.tier, l.status, l.max_devices, l.created_at,
                u.email as user_email,
                (SELECT COUNT(*) FROM public.user_devices d WHERE d.user_id = l.user_id) as active_devices_count
            FROM public.user_licenses l
            LEFT JOIN public.users u ON l.user_id = u.id
            ORDER BY l.created_at DESC LIMIT 100;
        """
        with get_supabase_cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

        licenses = []
        for r in rows:
            created_str = r["created_at"].strftime("%b %d, %Y") if hasattr(r["created_at"], "strftime") else str(r["created_at"])
            licenses.append({
                "id": r["id"],
                "user_id": str(r["user_id"]) if r["user_id"] else None,
                "user_email": r["user_email"] or "Unassigned",
                "license_key": r["license_key"],
                "tier": r["tier"],
                "status": r["status"] or "active",
                "max_devices": r["max_devices"] or 2,
                "active_devices_count": r["active_devices_count"] or 0,
                "created_at": created_str,
            })
        return licenses

    @staticmethod
    def revoke_license(license_key: str) -> bool:
        """Revokes an active license key."""
        with get_supabase_cursor() as cur:
            cur.execute(
                "UPDATE public.user_licenses SET status = 'revoked' WHERE license_key = %s;",
                (license_key,),
            )
            return cur.rowcount > 0

    @staticmethod
    def list_billing_audit_log(limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent user merge requests for billing audits."""
        query = """
            SELECT 
                r.id, r.user_id, r.hardware_id, r.request_type, 
                r.video_count, r.duration_seconds, r.status, r.created_at,
                u.email as user_email
            FROM public.user_requests r
            LEFT JOIN public.users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT %s;
        """
        with get_supabase_cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()

        logs = []
        for r in rows:
            created_str = r["created_at"].strftime("%b %d, %Y %H:%M:%S") if hasattr(r["created_at"], "strftime") else str(r["created_at"])
            logs.append({
                "id": str(r["id"]),
                "user_id": str(r["user_id"]) if r["user_id"] else None,
                "user_email": r["user_email"] or "Guest Workstation",
                "hardware_id": r["hardware_id"] or "N/A",
                "request_type": r["request_type"],
                "video_count": r["video_count"] or 0,
                "duration_seconds": r["duration_seconds"] or 0,
                "status": r["status"] or "completed",
                "created_at": created_str,
            })
        return logs
