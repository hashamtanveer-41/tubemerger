from pydantic import BaseModel
from typing import Optional, List

class CreateCheckoutRequest(BaseModel):
    plan_tier: str  # 'CREATOR_PRO_MONTHLY', 'CREATOR_PRO_ANNUAL', 'LIFETIME'
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CreateCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    plan_tier: str

class PlanItem(BaseModel):
    id: str
    name: str
    price: str
    interval: Optional[str] = None
    description: str
    features: List[str]
    popular: bool = False
    badge: Optional[str] = None
