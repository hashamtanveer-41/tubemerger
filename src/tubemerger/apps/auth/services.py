"""Auth Service - Manages Supabase PostgreSQL authentication, node-locking, and session sync."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import HTTPException

from tubemerger.apps.auth.db import get_supabase_cursor
from tubemerger.apps.auth.security import hash_password, verify_password, generate_session_token, generate_handle
from tubemerger.apps.licensing.services.fingerprint_service import FingerprintService
from tubemerger.apps.licensing.services.crypto_service import CryptoService
from tubemerger.db.connection import get_db_connection

logger = logging.getLogger(__name__)

class AuthService:
    """Manages cloud user registration, authentication, and hardware node-locking."""

    @classmethod
    def register(cls, email: str, password: str, full_name: str, device_name: str = "Primary Workstation") -> Dict[str, Any]:
        """Register a new user in Supabase, provision license, and bind machine."""
        email_clean = email.strip().lower()
        full_name_clean = full_name.strip()
        pwd_hash = hash_password(password)
        handle = generate_handle(full_name_clean)
        hwid = FingerprintService.get_hardware_id()

        try:
            with get_supabase_cursor() as cur:
                # 1. Check if email already registered
                cur.execute("SELECT id FROM public.users WHERE email = %s;", (email_clean,))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="An account with this email already exists.")

                # 2. Insert new user
                cur.execute(
                    """
                    INSERT INTO public.users (email, password_hash, full_name, handle, tier)
                    VALUES (%s, %s, %s, %s, 'CREATOR_PRO')
                    RETURNING id, email, full_name, handle, avatar_url, tier, created_at;
                    """,
                    (email_clean, pwd_hash, full_name_clean, handle),
                )
                user_row = cur.fetchone()
                user_id = str(user_row["id"])

                # 3. Provision license key
                import secrets
                license_key = f"TM-PRO-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
                cur.execute(
                    """
                    INSERT INTO public.user_licenses (user_id, license_key, tier, status, max_devices)
                    VALUES (%s, %s, 'CREATOR_PRO', 'active', 2)
                    RETURNING license_key, tier, max_devices;
                    """,
                    (user_id, license_key),
                )
                lic_row = cur.fetchone()

                # 4. Bind hardware device (Device 1 of 2)
                cur.execute(
                    """
                    INSERT INTO public.user_devices (user_id, license_key, hardware_id, device_name)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (license_key, hardware_id) DO NOTHING;
                    """,
                    (user_id, license_key, hwid, device_name),
                )

                # 5. Create active session token (30 days)
                session_token = generate_session_token()
                expires_at = datetime.utcnow() + timedelta(days=30)
                cur.execute(
                    """
                    INSERT INTO public.user_sessions (token, user_id, hardware_id, expires_at)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (session_token, user_id, hwid, expires_at),
                )

                # 6. Retrieve active devices
                cur.execute(
                    "SELECT hardware_id, device_name, activated_at FROM public.user_devices WHERE user_id = %s;",
                    (user_id,),
                )
                device_rows = cur.fetchall()

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Supabase registration failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Database registration error: {str(exc)}")

        # Sync locally to SQLite WAL & sign Ed25519 token for seamless offline tolerance
        cls._sync_local_license(license_key, "CREATOR_PRO", hwid)

        active_devices = [
            {
                "hardware_id": d["hardware_id"],
                "device_name": d["device_name"],
                "activated_at": d["activated_at"].strftime("%b %d, %Y") if hasattr(d["activated_at"], "strftime") else str(d["activated_at"]),
                "is_current": (d["hardware_id"] == hwid),
            }
            for d in device_rows
        ]

        return {
            "token": session_token,
            "user": {
                "id": user_id,
                "email": user_row["email"],
                "full_name": user_row["full_name"],
                "handle": user_row["handle"],
                "avatar_url": user_row["avatar_url"],
                "tier": user_row["tier"],
                "created_at": user_row["created_at"].strftime("%b %Y") if hasattr(user_row["created_at"], "strftime") else "Sep 2026",
            },
            "plan_tier": lic_row["tier"],
            "max_devices": lic_row["max_devices"],
            "active_devices": active_devices,
        }

    @classmethod
    def login(cls, email: str, password: str, device_name: str = "Workstation") -> Dict[str, Any]:
        """Authenticate with Supabase cloud, verify password, enforce 2-device node-lock."""
        email_clean = email.strip().lower()
        hwid = FingerprintService.get_hardware_id()

        try:
            with get_supabase_cursor() as cur:
                # 1. Fetch user record
                cur.execute(
                    "SELECT id, email, password_hash, full_name, handle, avatar_url, tier, created_at FROM public.users WHERE email = %s;",
                    (email_clean,),
                )
                user_row = cur.fetchone()
                if not user_row or not verify_password(password, user_row["password_hash"]):
                    raise HTTPException(status_code=401, detail="Invalid email or password.")

                user_id = str(user_row["id"])

                # 2. Fetch active license
                cur.execute(
                    "SELECT license_key, tier, status, max_devices FROM public.user_licenses WHERE user_id = %s LIMIT 1;",
                    (user_id,),
                )
                lic_row = cur.fetchone()
                if not lic_row:
                    # Provision default license if not present
                    import secrets
                    license_key = f"TM-PRO-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
                    cur.execute(
                        "INSERT INTO public.user_licenses (user_id, license_key, tier, max_devices) VALUES (%s, %s, 'CREATOR_PRO', 2) RETURNING *;",
                        (user_id, license_key),
                    )
                    lic_row = cur.fetchone()

                license_key = lic_row["license_key"]
                max_devices = lic_row["max_devices"] or 2

                # 3. Check node-locking (active devices)
                cur.execute(
                    "SELECT hardware_id, device_name, activated_at FROM public.user_devices WHERE user_id = %s;",
                    (user_id,),
                )
                device_rows = cur.fetchall()
                active_hwids = {d["hardware_id"]: d for d in device_rows}

                # If this machine is already activated, update timestamp
                if hwid in active_hwids:
                    cur.execute(
                        "UPDATE public.user_devices SET last_seen_at = NOW() WHERE user_id = %s AND hardware_id = %s;",
                        (user_id, hwid),
                    )
                else:
                    # Device limit enforcement
                    if len(active_hwids) >= max_devices:
                        active_list = [
                            {"hardware_id": d["hardware_id"], "device_name": d["device_name"]}
                            for d in device_rows
                        ]
                        raise HTTPException(
                            status_code=409,
                            detail={
                                "error": f"Activation limit reached ({len(active_hwids)}/{max_devices} devices).",
                                "message": "Please deactivate an older workstation to sign in on this machine.",
                                "active_devices": active_list,
                            },
                        )

                    # Activate new device slot
                    cur.execute(
                        """
                        INSERT INTO public.user_devices (user_id, license_key, hardware_id, device_name)
                        VALUES (%s, %s, %s, %s);
                        """,
                        (user_id, license_key, hwid, device_name),
                    )

                # 4. Generate active session
                session_token = generate_session_token()
                expires_at = datetime.utcnow() + timedelta(days=30)
                cur.execute(
                    """
                    INSERT INTO public.user_sessions (token, user_id, hardware_id, expires_at)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (session_token, user_id, hwid, expires_at),
                )

                # Re-fetch all active devices
                cur.execute(
                    "SELECT hardware_id, device_name, activated_at FROM public.user_devices WHERE user_id = %s;",
                    (user_id,),
                )
                all_devices = cur.fetchall()

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Supabase login failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Database login error: {str(exc)}")

        # Sync locally to SQLite WAL & sign Ed25519 token
        cls._sync_local_license(license_key, lic_row["tier"], hwid)

        active_devices = [
            {
                "hardware_id": d["hardware_id"],
                "device_name": d["device_name"],
                "activated_at": d["activated_at"].strftime("%b %d, %Y") if hasattr(d["activated_at"], "strftime") else str(d["activated_at"]),
                "is_current": (d["hardware_id"] == hwid),
            }
            for d in all_devices
        ]

        return {
            "token": session_token,
            "user": {
                "id": user_id,
                "email": user_row["email"],
                "full_name": user_row["full_name"],
                "handle": user_row["handle"],
                "avatar_url": user_row["avatar_url"],
                "tier": user_row["tier"],
                "role": user_row.get("role") or "user",
                "created_at": user_row["created_at"].strftime("%b %Y") if hasattr(user_row["created_at"], "strftime") else "Sep 2026",
            },
            "plan_tier": lic_row["tier"],
            "max_devices": lic_row["max_devices"],
            "active_devices": active_devices,
        }

    @classmethod
    def get_current_user(cls, token: str) -> Dict[str, Any]:
        """Validate session token and return user profile + device status."""
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token required.")

        hwid = FingerprintService.get_hardware_id()
        try:
            with get_supabase_cursor() as cur:
                cur.execute(
                    """
                    SELECT s.user_id, s.expires_at, u.email, u.full_name, u.handle, u.avatar_url, u.tier, u.role, u.created_at
                    FROM public.user_sessions s
                    JOIN public.users u ON s.user_id = u.id
                    WHERE s.token = %s AND s.expires_at > NOW();
                    """,
                    (token,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")

                user_id = str(row["user_id"])

                # Fetch license
                cur.execute(
                    "SELECT license_key, tier, max_devices FROM public.user_licenses WHERE user_id = %s LIMIT 1;",
                    (user_id,),
                )
                lic_row = cur.fetchone()
                plan_tier = lic_row["tier"] if lic_row else "CREATOR_PRO"
                max_devs = lic_row["max_devices"] if lic_row else 2

                # Fetch devices
                cur.execute(
                    "SELECT hardware_id, device_name, activated_at FROM public.user_devices WHERE user_id = %s;",
                    (user_id,),
                )
                device_rows = cur.fetchall()

        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Error retrieving user: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to fetch user session.")

        active_devices = [
            {
                "hardware_id": d["hardware_id"],
                "device_name": d["device_name"],
                "activated_at": d["activated_at"].strftime("%b %d, %Y") if hasattr(d["activated_at"], "strftime") else str(d["activated_at"]),
                "is_current": (d["hardware_id"] == hwid),
            }
            for d in device_rows
        ]

        return {
            "token": token,
            "user": {
                "id": user_id,
                "email": row["email"],
                "full_name": row["full_name"],
                "handle": row["handle"],
                "avatar_url": row["avatar_url"],
                "tier": row["tier"],
                "role": row.get("role") or "user",
                "created_at": row["created_at"].strftime("%b %Y") if hasattr(row["created_at"], "strftime") else "Sep 2026",
            },
            "plan_tier": plan_tier,
            "max_devices": max_devs,
            "active_devices": active_devices,
        }

    @classmethod
    def logout(cls, token: str) -> bool:
        """Invalidate session in Supabase cloud and clear local license cache."""
        try:
            with get_supabase_cursor() as cur:
                cur.execute("DELETE FROM public.user_sessions WHERE token = %s;", (token,))
        except Exception:
            pass

        # Clear offline Ed25519 license file and local SQLite license records
        try:
            CryptoService.remove_license_file()
            conn = get_db_connection()
            with conn:
                conn.execute("DELETE FROM licenses;")
                conn.execute("DELETE FROM device_activations;")
        except Exception:
            pass

        return True

    @classmethod
    def deactivate_device(cls, token: str, target_hwid: str) -> Dict[str, Any]:
        """Deactivate a workstation hardware slot to free it for another machine."""
        user_data = cls.get_current_user(token)
        user_id = user_data["user"]["id"]

        try:
            with get_supabase_cursor() as cur:
                cur.execute(
                    "DELETE FROM public.user_devices WHERE user_id = %s AND hardware_id = %s;",
                    (user_id, target_hwid),
                )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to deactivate device: {exc}")

        return cls.get_current_user(token)

    @staticmethod
    def _sync_local_license(license_key: str, tier: str, hwid: str) -> None:
        """Issue offline cryptographic Ed25519 token and persist in local SQLite WAL."""
        try:
            import time
            payload = {
                "license_key": license_key,
                "machine_id": hwid,
                "tier": tier,
                "issued_at": int(time.time()),
                "offline_grace_until": int(time.time()) + (30 * 86400),
                "max_devices": 2,
            }
            token = CryptoService.sign_license(payload)
            CryptoService.save_license_file(token)

            conn = get_db_connection()
            with conn:
                conn.execute(
                    """
                    INSERT INTO licenses (key, plan_tier, status, max_devices, expires_at)
                    VALUES (?, ?, 'active', 2, 'Cloud Verified License')
                    ON CONFLICT(key) DO UPDATE SET
                        plan_tier = excluded.plan_tier,
                        status = 'active';
                    """,
                    (license_key, tier),
                )
                conn.execute(
                    """
                    INSERT INTO device_activations (license_key, hardware_id, device_name)
                    VALUES (?, ?, 'Primary Workstation')
                    ON CONFLICT(license_key, hardware_id) DO UPDATE SET
                        last_ping_at = CURRENT_TIMESTAMP;
                    """,
                    (license_key, hwid),
                )
        except Exception as exc:
            logger.warning("Local license sync warning: %s", exc)
