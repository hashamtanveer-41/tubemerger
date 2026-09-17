import os
import json
import hmac
import hashlib
import secrets
import logging
import httpx
from typing import Dict, Any, List, Optional

from tubemerger.apps.auth.db import get_supabase_cursor

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lemon Squeezy Configuration (loaded from .env)
# ---------------------------------------------------------------------------
LS_API_KEY = os.environ.get("LS_API_KEY", "")
LS_WEBHOOK_SECRET = os.environ.get("LS_WEBHOOK_SECRET", "")
LS_STORE_ID = os.environ.get("LS_STORE_ID", "")

# Variant IDs map tier → Lemon Squeezy variant ID
LS_VARIANT_LIFETIME = os.environ.get("LS_VARIANT_LIFETIME", "")      # $49 one-time
LS_VARIANT_CREATOR_PRO = os.environ.get("LS_VARIANT_CREATOR_PRO", "") # $4.99/mo

LS_API_BASE = "https://api.lemonsqueezy.com/v1"

PLANS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "COMMUNITY",
        "name": "Community Free",
        "price": "$0",
        "interval": "Forever",
        "description": "Essential playlist stitching for personal listening & study.",
        "features": [
            "3 playlist merges per week",
            "Up to 1080p Full HD encoding",
            "Standard CPU software encoding",
            "1 linked workstation node",
        ],
        "popular": False,
        "badge": None,
    },
    {
        "id": "CREATOR_PRO_MONTHLY",
        "name": "Creator Pro (Monthly)",
        "price": "$4.99",
        "interval": "per month",
        "description": "Uncapped multi-hour playlists for YouTube creators & editors.",
        "features": [
            "Unlimited playlist merges (No limits)",
            "4K 60FPS Ultra HD encoding",
            "NVIDIA / Apple Silicon NVENC acceleration",
            "Automatic YouTube chapters embedding",
            "2 active workstation nodes",
        ],
        "popular": True,
        "badge": "MOST POPULAR",
    },
    {
        "id": "LIFETIME",
        "name": "Lifetime Hero Pass",
        "price": "$49",
        "interval": "one-time payment",
        "description": "Pay once, own TubeMerge forever with all future AI updates included.",
        "features": [
            "Everything in Creator Pro forever",
            "All future v2.0 AI tools included (Auto-Bumper, Voice Ripper)",
            "Permanent offline cryptographic license",
            "Priority discord & email support",
            "Up to 5 workstation nodes",
        ],
        "popular": False,
        "badge": "BEST VALUE",
    },
]


def _ls_headers() -> Dict[str, str]:
    """Standard Lemon Squeezy API request headers."""
    return {
        "Authorization": f"Bearer {LS_API_KEY}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }


class BillingService:
    @staticmethod
    def get_plans() -> List[Dict[str, Any]]:
        """Returns public subscription plans catalog."""
        return PLANS_CATALOG

    @staticmethod
    def create_checkout_session(
        user_id: str,
        user_email: str,
        plan_tier: str,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> Dict[str, str]:
        """Creates a Lemon Squeezy Checkout for subscription or lifetime purchase.

        Embeds user_id in custom_data so the webhook can look it up and fulfill
        the purchase automatically in Supabase.
        """
        s_url = success_url or "http://127.0.0.1:7842/ui/index.html?payment=success"
        c_url = cancel_url or "http://127.0.0.1:7842/ui/index.html?payment=cancelled"

        target_tier = "LIFETIME" if "LIFETIME" in plan_tier.upper() else "CREATOR_PRO"

        # ── Dev / no-credentials fallback: instantly simulate fulfillment ──
        if not LS_API_KEY or not LS_STORE_ID:
            logger.info("LS_API_KEY/LS_STORE_ID not set — simulating instant checkout.")
            BillingService.fulfill_purchase(user_id=user_id, plan_tier=target_tier)
            return {
                "checkout_url": f"{s_url}&simulated=true&plan={target_tier}",
                "session_id": f"sim_sess_{secrets.token_hex(12)}",
                "plan_tier": target_tier,
            }

        variant_id = (
            LS_VARIANT_LIFETIME if target_tier == "LIFETIME" else LS_VARIANT_CREATOR_PRO
        )
        if not variant_id:
            raise ValueError(
                f"LS variant ID not configured for tier '{target_tier}'. "
                "Set LS_VARIANT_LIFETIME / LS_VARIANT_CREATOR_PRO in .env."
            )

        body = {
            "data": {
                "type": "checkouts",
                "attributes": {
                    "checkout_options": {
                        "embed": False,
                        "media": True,
                        "logo": True,
                    },
                    "checkout_data": {
                        "email": user_email,
                        "custom": {
                            # Embedded in webhook payload as meta.custom_data
                            "user_id": user_id,
                            "plan_tier": target_tier,
                        },
                    },
                    "product_options": {
                        "redirect_url": s_url,
                    },
                    "expires_at": None,  # No expiry
                },
                "relationships": {
                    "store": {
                        "data": {"type": "stores", "id": str(LS_STORE_ID)}
                    },
                    "variant": {
                        "data": {"type": "variants", "id": str(variant_id)}
                    },
                },
            }
        }

        try:
            resp = httpx.post(
                f"{LS_API_BASE}/checkouts",
                headers=_ls_headers(),
                json=body,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            checkout_url = data["data"]["attributes"]["url"]
            checkout_id = data["data"]["id"]

            return {
                "checkout_url": checkout_url,
                "session_id": checkout_id,
                "plan_tier": target_tier,
            }
        except httpx.HTTPStatusError as exc:
            logger.error("Lemon Squeezy checkout error: %s — %s", exc.response.status_code, exc.response.text)
            raise ValueError(f"Lemon Squeezy error: {exc.response.text}")
        except Exception as exc:
            logger.error("Lemon Squeezy checkout unexpected error: %s", exc)
            raise ValueError(f"Checkout error: {str(exc)}")

    @staticmethod
    def fulfill_purchase(user_id: str, plan_tier: str) -> None:
        """Fulfills entitlement after verified payment webhook.

        Updates public.users.tier and inserts a row into public.user_licenses.
        This method is intentionally kept provider-agnostic — it works for any
        payment provider as long as the caller has resolved user_id and plan_tier.
        """
        normalized_tier = "LIFETIME" if "LIFETIME" in plan_tier.upper() else "CREATOR_PRO"
        prefix = "TM-LIFETIME" if normalized_tier == "LIFETIME" else "TM-PRO"
        product_key = f"{prefix}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
        max_devices = 5 if normalized_tier == "LIFETIME" else 2

        try:
            import uuid
            user_uuid = str(uuid.UUID(str(user_id)))

            with get_supabase_cursor() as cur:
                # 1. Upgrade user tier
                cur.execute(
                    "UPDATE public.users SET tier = %s, updated_at = NOW() WHERE id = %s;",
                    (normalized_tier, user_uuid),
                )

                # 2. Insert license key (idempotent)
                cur.execute(
                    """
                    INSERT INTO public.user_licenses (user_id, license_key, tier, status, max_devices)
                    VALUES (%s, %s, %s, 'active', %s)
                    ON CONFLICT (license_key) DO NOTHING;
                    """,
                    (user_uuid, product_key, normalized_tier, max_devices),
                )

            logger.info(
                "Fulfillment complete — user=%s tier=%s license=%s",
                user_uuid, normalized_tier, product_key,
            )
        except Exception as exc:
            logger.warning("Fulfillment DB update skipped: %s", exc)

    @staticmethod
    def handle_webhook(payload: bytes, signature: Optional[str]) -> Dict[str, Any]:
        """Validates and processes Lemon Squeezy webhook events.

        Lemon Squeezy signs the raw request body with HMAC-SHA256 using the
        webhook secret. The signature is sent in the X-Signature-256 header.

        Supported events:
          - order_created       → one-time purchase (Lifetime)
          - subscription_created → new subscription (Creator Pro)
        """
        # ── Signature verification ──────────────────────────────────────────
        if LS_WEBHOOK_SECRET:
            if not signature:
                raise ValueError("Missing X-Signature-256 header.")
            expected = hmac.new(
                LS_WEBHOOK_SECRET.encode("utf-8"),
                payload,
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature.strip()):
                raise ValueError("Webhook signature mismatch — possible forgery.")
        else:
            logger.warning("LS_WEBHOOK_SECRET not set — skipping signature verification (dev mode).")

        # ── Parse payload ───────────────────────────────────────────────────
        try:
            event = json.loads(payload.decode("utf-8"))
        except Exception as exc:
            raise ValueError(f"Malformed webhook payload: {exc}")

        meta = event.get("meta", {})
        event_name = meta.get("event_name", "")
        custom_data = meta.get("custom_data", {})

        logger.info("Lemon Squeezy webhook received: %s", event_name)

        # ── Route events ────────────────────────────────────────────────────
        if event_name in ("order_created", "subscription_created"):
            user_id = custom_data.get("user_id")
            plan_tier = custom_data.get("plan_tier", "")

            # Fallback: infer tier from event type if custom_data is missing
            if not plan_tier:
                plan_tier = "LIFETIME" if event_name == "order_created" else "CREATOR_PRO"

            if user_id:
                BillingService.fulfill_purchase(user_id=user_id, plan_tier=plan_tier)
                return {"status": "fulfilled", "event": event_name, "user_id": user_id, "tier": plan_tier}
            else:
                logger.warning(
                    "Webhook %s received but no user_id in custom_data. "
                    "Ensure checkout URL includes ?checkout[custom][user_id]=UUID",
                    event_name,
                )
                return {"status": "skipped", "reason": "no user_id in custom_data", "event": event_name}

        # subscription_payment_success fires on each recurring charge — no re-fulfillment needed
        if event_name == "subscription_payment_success":
            return {"status": "ignored", "event": event_name, "reason": "recurring charge, already fulfilled"}

        return {"status": "ignored", "event": event_name}
