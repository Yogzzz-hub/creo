"""CRM domain models for Business Development Executives (BDE), Leads, Proposals, and Targets."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin


class Lead(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "bde_leads"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    assigned_bde_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_deal_value: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)  # in INR
    lead_source: Mapped[str] = mapped_column(String(100), default="Inbound Website", nullable=False)

    # Priority: "hot", "warm", "cold"
    priority: Mapped[str] = mapped_column(String(20), default="warm", nullable=False, index=True)

    # Status: "new", "contacted", "meeting_scheduled", "proposal_sent", "negotiation", "converted", "lost"
    status: Mapped[str] = mapped_column(String(50), default="new", nullable=False, index=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    metadata_extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    activities: Mapped[list[LeadActivity]] = relationship(
        "LeadActivity", back_populates="lead", cascade="all, delete-orphan", order_by="LeadActivity.created_at.desc()"
    )
    proposals: Mapped[list[BDEProposal]] = relationship(
        "BDEProposal", back_populates="lead", cascade="all, delete-orphan", order_by="BDEProposal.created_at.desc()"
    )


class LeadActivity(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "bde_lead_activities"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bde_leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bde_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Type: "call", "whatsapp", "email", "meeting", "note", "status_change", "proposal"
    activity_type: Mapped[str] = mapped_column(String(50), default="note", nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)

    scheduled_follow_up: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    lead: Mapped[Lead] = relationship("Lead", back_populates="activities")


class BDEProposal(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "bde_proposals"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bde_leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bde_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    plan_name: Mapped[str] = mapped_column(String(100), default="Growth Retainer", nullable=False)
    monthly_fee: Mapped[int] = mapped_column(BigInteger, nullable=False)  # in INR
    discount_pct: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    final_monthly_fee: Mapped[int] = mapped_column(BigInteger, nullable=False)
    contract_months: Mapped[int] = mapped_column(BigInteger, default=6, nullable=False)
    total_contract_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deliverables: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    
    # Status: "draft", "sent", "accepted", "rejected", "expired"
    status: Mapped[str] = mapped_column(String(50), default="sent", nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    metadata_extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    lead: Mapped[Lead] = relationship("Lead", back_populates="proposals")


class BDETarget(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "bde_targets"

    bde_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # e.g. "2026-10"
    monthly_quota: Mapped[int] = mapped_column(BigInteger, default=2500000, nullable=False)  # ₹25,00,000
    closed_revenue: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    commission_rate: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)  # 5.0%
    commission_earned: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    deals_won: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
