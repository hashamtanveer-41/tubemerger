"""Cryptographic Security Vault for Bundled Credentials & API Keys.

Implements AES-256-GCM authenticated encryption with XOR-masking and
PBKDF2 key derivation. Protects bundled cloud credentials against static
binary decompilation and strings extraction on distributed workstations.
"""

import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# ---------------------------------------------------------------------------
# Split-Mask Entropy Parts (avoid single contiguous plaintext in binary)
# ---------------------------------------------------------------------------
_PART_A = b"\x54\x75\x62\x65\x4d\x65\x72\x67\x65\x5f\x53\x65\x63\x75\x72\x65"
_PART_B = b"\x5f\x41\x70\x70\x5f\x56\x61\x75\x6c\x74\x5f\x32\x30\x32\x36\x21"
_SALT = b"TubeMerge_Vault_Salt_v1"

def _derive_vault_key() -> bytes:
    """Derives a 256-bit AES key from split-mask segments via SHA-256."""
    combined = bytes(a ^ b for a, b in zip(_PART_A, _PART_B))
    return hashlib.pbkdf2_hmac("sha256", combined, _SALT, 100_000, dklen=32)

class SecurityVault:
    """Provides AES-256-GCM encryption and in-memory decryption for bundled credentials."""

    @classmethod
    def encrypt_secret(cls, plaintext: str) -> str:
        """Encrypts a plaintext credential string using AES-256-GCM.
        
        Format returned: base64(nonce [12 bytes] + ciphertext + auth_tag [16 bytes])
        """
        key = _derive_vault_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")

    @classmethod
    def decrypt_secret(cls, encrypted_token: str) -> str:
        """Decrypts an AES-256-GCM encrypted credential back to plaintext."""
        key = _derive_vault_key()
        aesgcm = AESGCM(key)
        raw_data = base64.urlsafe_b64decode(encrypted_token.encode("ascii"))
        if len(raw_data) < 28:
            raise ValueError("Invalid vault ciphertext format.")
        nonce = raw_data[:12]
        ciphertext = raw_data[12:]
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode("utf-8")

    @classmethod
    def get_database_url(cls, fallback_env_url: Optional[str] = None) -> str:
        """Retrieves authoritative database URL with fallback decryption.
        
        Prioritizes live environment/file variable, otherwise uses vault token.
        """
        if fallback_env_url and fallback_env_url.startswith("postgresql://"):
            return fallback_env_url

        vault_token = os.environ.get("TUBEMERGE_VAULT_SUPABASE_DB")
        if vault_token:
            try:
                return cls.decrypt_secret(vault_token)
            except Exception:
                pass

        return fallback_env_url or ""
