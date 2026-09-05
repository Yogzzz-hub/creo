from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SalesClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    full_name: str
    business_name: Optional[str] = None
    plan_name: Optional[str] = None
    account_status: str
    created_at: datetime


class CustomPricingRequestCreate(BaseModel):
    client_id: str
    proposed_monthly_price: float
    posters_quota: int
    reels_quota: int
    stories_quota: int
    notes: Optional[str] = None


class CustomPricingApprovalRequest(BaseModel):
    admin_notes: Optional[str] = None
