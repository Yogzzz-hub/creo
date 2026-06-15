from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import PaymentGateway


class SubscriptionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    plan_id: str
    status: str
    gateway: PaymentGateway
    gateway_subscription_id: str
    gateway_customer_id: str
    current_period_start: datetime
    current_period_end: datetime


class SubscriptionCreate(BaseModel):
    user_id: str
    plan_id: str
    status: str
    gateway: PaymentGateway
    gateway_subscription_id: str
    gateway_customer_id: str
    current_period_start: datetime
    current_period_end: datetime


class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class SubscriptionOut(SubscriptionBase):
    id: str
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
