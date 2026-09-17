"""Admin Account Provisioning Utility for TubeMerge."""

import sys
import secrets
from tubemerger.apps.auth.db import get_supabase_cursor
from tubemerger.apps.auth.security import hash_password

def provision_admin(email: str, password: str, full_name: str = "Administrator", handle: str = "@admin"):
    email_clean = email.strip().lower()
    pwd_hash = hash_password(password)

    with get_supabase_cursor() as cur:
        # Check if already exists
        cur.execute("SELECT id FROM public.users WHERE email = %s;", (email_clean,))
        existing = cur.fetchone()

        if existing:
            user_id = existing["id"]
            cur.execute(
                """
                UPDATE public.users
                SET password_hash = %s, full_name = %s, role = 'admin', tier = 'LIFETIME'
                WHERE id = %s
                RETURNING id, email, full_name, role, tier;
                """,
                (pwd_hash, full_name, user_id),
            )
            print(f"[OK] Existing user '{email_clean}' promoted to Administrator with LIFETIME access.")
        else:
            cur.execute(
                """
                INSERT INTO public.users (email, password_hash, full_name, handle, role, tier)
                VALUES (%s, %s, %s, %s, 'admin', 'LIFETIME')
                RETURNING id, email, full_name, role, tier;
                """,
                (email_clean, pwd_hash, full_name, handle),
            )
            user_row = cur.fetchone()
            user_id = user_row["id"]
            print(f"[OK] New Admin user created: {email_clean}")

        # Provision Lifetime Admin Master Key
        admin_key = f"TM-ADMIN-LIFETIME-{secrets.token_hex(4).upper()}"
        cur.execute(
            """
            INSERT INTO public.user_licenses (user_id, license_key, tier, status, max_devices)
            VALUES (%s, %s, 'LIFETIME', 'active', 100)
            ON CONFLICT (license_key) DO NOTHING;
            """,
            (user_id, admin_key),
        )
        print(f"[OK] Admin Master License Key issued: {admin_key} (Max 100 Workstations)")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@tubemerge.com"
    pwd = sys.argv[2] if len(sys.argv) > 2 else "TubeMergeAdmin2026!"
    name = sys.argv[3] if len(sys.argv) > 3 else "TubeMerge Admin"
    provision_admin(email, pwd, name)
