from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import PaymentGateway


class PaymentHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: str
    amount: float
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


class TwoFactorRequest(BaseModel):
    enabled: bool


class CreateOrderRequest(BaseModel):
    amount: float
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[dict] = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str
    receipt: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str


class VerifyPaymentResponse(BaseModel):
    valid: bool
    order_id: str
    payment_id: str
    status: str
    account_status: str
    plan_name: str
    onboarding_stage: int
