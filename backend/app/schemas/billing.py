"""Pydantic schemas for billing, plans, payments, and checkout orders."""

from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentProvider


class PlanResponse(BaseModel):
    """Public plan representation."""

    id: uuid.UUID
    name: str
    display_name: str
    price_minor: int
    currency: str
    monthly_price: Decimal
    poster_quota: int
    reel_quota: int
    story_quota: int
    revision_rounds: int
    has_dedicated_manager: bool
    highlights: list[str]
    is_recommended: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class CreateOrderRequest(BaseModel):
    """Create checkout order request."""

    plan_id: uuid.UUID
    gateway: PaymentProvider = Field(default=PaymentProvider.RAZORPAY)


class CreateOrderResponse(BaseModel):
    """Client checkout payload with gateway credentials and order details."""

    subscription_id: uuid.UUID
    gateway: PaymentProvider
    order_id: str
    amount_minor: int
    currency: str
    key_id: str


class ConfirmPaymentRequest(BaseModel):
    """Client payment completion verification."""

    gateway: PaymentProvider
    order_id: str
    payment_id: str
    signature: str


class ConfirmPaymentResponse(BaseModel):
    """Payment confirmation status."""

    status: str = Field(description="'active' when confirmed by webhook, 'pending' otherwise")
    subscription_id: uuid.UUID
