"""Revenue workspace entities; existing bde_leads remain the CRM identity."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AgencyRecord:
    agency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agencies.id"), index=True
    )


class CRMPolicy(Base, AgencyRecord, TimestampMixin):
    __tablename__ = "crm_policies"
    agency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agencies.id"), primary_key=True
    )
    branding: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class CRMTask(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_tasks"
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bde_leads.id"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(255))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    outcome: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    alerted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CRMService(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_services"
    __table_args__ = (UniqueConstraint("agency_id", "sku", name="uq_crm_service_sku"),)
    sku: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    unit_price: Mapped[int] = mapped_column(BigInteger)  # minor currency units
    minimum_price: Mapped[int] = mapped_column(BigInteger, default=0)
    billing: Mapped[str] = mapped_column(String(20), default="one_time")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class CRMProposal(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_proposals"
    __table_args__ = (
        UniqueConstraint("agency_id", "number", "version", name="uq_crm_proposal_version"),
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bde_leads.id"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    number: Mapped[str] = mapped_column(String(60))
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    share_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pdf_content: Mapped[bytes | None] = mapped_column(LargeBinary)


class CRMReferral(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_referrals"
    __table_args__ = (UniqueConstraint("agency_id", "lead_id", name="uq_crm_referral_lead"),)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bde_leads.id"))
    acquired_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    referrer: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(100), default="Referral")
    status: Mapped[str] = mapped_column(String(20), default="submitted")
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str] = mapped_column(Text, default="")


class CRMFinanceEntry(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_finance_entries"
    __table_args__ = (
        UniqueConstraint("agency_id", "kind", "reference", name="uq_crm_finance_reference"),
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bde_leads.id"), index=True
    )
    recorded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(20))  # invoice or receipt; never inferred from won
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    reference: Mapped[str] = mapped_column(String(100))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CRMConsent(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_consents"
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bde_leads.id"), index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20))
    evidence: Mapped[str] = mapped_column(Text)
    purpose: Mapped[str] = mapped_column(String(255))


class CRMMessage(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_messages"
    __table_args__ = (UniqueConstraint("agency_id", "idempotency_key", name="uq_crm_message_key"),)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bde_leads.id"), index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    direction: Mapped[str] = mapped_column(String(10), default="outbound")
    provider_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    error: Mapped[str | None] = mapped_column(Text)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    metadata_extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class CRMHandoff(Base, AgencyRecord, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "crm_handoffs"
    __table_args__ = (UniqueConstraint("agency_id", "lead_id", name="uq_crm_handoff_lead"),)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bde_leads.id"))
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crm_proposals.id")
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
