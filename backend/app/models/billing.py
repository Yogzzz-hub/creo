"""Billing and payment models: plans, subscriptions, payment_events, usage_counters."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DeliverableType, PaymentProvider, SubscriptionStatus, pg_enum

if TYPE_CHECKING:
    from app.models.user import User


class Plan(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    monthly_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    poster_quota: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    reel_quota: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    story_quota: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    revision_rounds: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    has_dedicated_manager: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    highlights: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scarcity_slots: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    subscriptions: Mapped[list[Subscription]] = relationship("Subscription", back_populates="plan")


class Subscription(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subscriptions"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id"),
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        pg_enum(SubscriptionStatus, "subscription_status"),
        default=SubscriptionStatus.INCOMPLETE,
        nullable=False,
    )
    gateway: Mapped[PaymentProvider] = mapped_column(
        pg_enum(PaymentProvider, "payment_provider"),
        nullable=False,
    )
    gateway_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gateway_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    client: Mapped[User] = relationship("User", back_populates="subscriptions")
    plan: Mapped[Plan] = relationship("Plan", back_populates="subscriptions")

    __table_args__ = (
        Index(
            "uq_sub_active_per_client",
            "client_id",
            unique=True,
            postgresql_where=(status.in_([SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE])),
        ),
    )


class PaymentEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payment_events"

    provider: Mapped[PaymentProvider] = mapped_column(
        pg_enum(PaymentProvider, "payment_provider"),
        nullable=False,
    )
    provider_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_payment_event"),
        Index(
            "idx_payment_events_unprocessed",
            "received_at",
            postgresql_where=(processed_at.is_(None)),
        ),
    )


class UsageCounter(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "usage_counters"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[DeliverableType] = mapped_column(
        pg_enum(DeliverableType, "deliverable_type"),
        nullable=False,
    )
    quota: Mapped[int] = mapped_column(Integer, nullable=False)
    used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    client: Mapped[User] = relationship("User", back_populates="usage_counters")

    __table_args__ = (
        UniqueConstraint("client_id", "period_start", "kind", name="uq_usage"),
        CheckConstraint("used >= 0 AND used <= quota", name="ck_usage_bounds"),
    )
