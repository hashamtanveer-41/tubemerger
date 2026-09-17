from fastapi import APIRouter, Header, HTTPException, Request
from typing import Optional, List

from tubemerger.apps.billing.schemas import (
    CreateCheckoutRequest,
    CreateCheckoutResponse,
    PlanItem,
)
from tubemerger.apps.billing.services import BillingService
from tubemerger.apps.auth.services import AuthService

router = APIRouter(prefix="/api/billing", tags=["Cloud Billing & Payments"])


def _extract_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization


@router.get("/plans", response_model=List[PlanItem])
def get_plans():
    """Retrieve public subscription and lifetime plans catalog."""
    return BillingService.get_plans()


@router.post("/create-checkout-session", response_model=CreateCheckoutResponse)
def create_checkout_session(
    payload: CreateCheckoutRequest,
    authorization: Optional[str] = Header(None),
):
    """Generates a Lemon Squeezy Checkout URL for upgrading the authenticated user's plan.

    The user's UUID is embedded in the checkout's custom_data so the webhook
    can automatically fulfill the purchase in Supabase.
    """
    token = _extract_token(authorization)
    auth_data = AuthService.get_current_user(token)
    user = auth_data["user"]

    try:
        result = BillingService.create_checkout_session(
            user_id=user["id"],
            user_email=user["email"],
            plan_tier=payload.plan_tier,
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
        )
        return CreateCheckoutResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/webhook/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request,
    x_signature_256: Optional[str] = Header(None),
):
    """Processes Lemon Squeezy Webhooks for instant license fulfillment.

    Lemon Squeezy sends the raw body signed with HMAC-SHA256 (X-Signature-256 header).
    Supported events: order_created, subscription_created.
    """
    payload = await request.body()
    try:
        res = BillingService.handle_webhook(payload, x_signature_256)
        return res
    except ValueError as exc:
        # Signature mismatch or bad payload → 400
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(exc)}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal webhook error: {str(exc)}")
