"""Cryptographic security utilities for user authentication."""

import hashlib
import re
import secrets

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        100000,
    )
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against salt$key using constant-time comparison."""
    try:
        salt, key_hex = hashed.split("$")
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            100000,
        )
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def generate_session_token() -> str:
    """Generate high-entropy 64-char URL-safe token."""
    return f"tm_sess_{secrets.token_urlsafe(32)}"

def generate_handle(full_name: str) -> str:
    """Convert a name into a clean YouTube-style creator handle."""
    clean = re.sub(r"[^a-zA-Z0-9]", "", full_name.lower())
    if not clean:
        clean = "creator"
    rand_suffix = secrets.token_hex(2)
    return f"@{clean}_{rand_suffix}"
