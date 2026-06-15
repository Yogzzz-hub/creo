from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import PaymentGateway


class PaymentHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: str
    status: str
    gateway: PaymentGateway
    gateway_subscription_id: str
    gateway_customer_id: str
    current_period_start: datetime
    current_period_end: datetime
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class PlanChangeRequest(BaseModel):
    new_plan_id: str
