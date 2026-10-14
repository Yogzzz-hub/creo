"""Instagram authorization transactions and durable per-version publishing jobs."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InstagramTestPost(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "instagram_test_posts"
    agency_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agencies.id"))
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    account_id: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="queued")
    container_id: Mapped[str | None] = mapped_column(String(255))
    media_id: Mapped[str | None] = mapped_column(String(255))
    permalink: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)


class InstagramOAuth(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "instagram_oauth"
    agency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agencies.id"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    state_hash: Mapped[str] = mapped_column(String(64), unique=True)
    verifier_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed: Mapped[bool] = mapped_column(default=False)
    candidates_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary)


class PublishingJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "publishing_jobs"
    agency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agencies.id"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deliverables.id"), unique=True
    )
    calendar_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_calendar.id", ondelete="SET NULL")
    )
    connection_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    instagram_account_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="pending_approval")
    caption: Mapped[str] = mapped_column(Text, default="")
    media_type: Mapped[str] = mapped_column(String(20), default="IMAGE")
    approved_fingerprint: Mapped[str | None] = mapped_column(String(64))
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stage: Mapped[str] = mapped_column(String(30), default="new")
    container_id: Mapped[str | None] = mapped_column(String(255))
    container_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    media_id: Mapped[str | None] = mapped_column(String(255))
    permalink: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    error_code: Mapped[str | None] = mapped_column(String(60))
    media_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    __table_args__ = (
        Index("ix_publishing_due", "status", "next_attempt_at", "scheduled_at"),
        CheckConstraint(
            "status != 'scheduled' OR (scheduled_at IS NOT NULL "
            "AND approved_fingerprint IS NOT NULL AND approved_by = client_id "
            "AND connection_id IS NOT NULL AND instagram_account_id IS NOT NULL "
            "AND media_metadata->>'sha256' IS NOT NULL)",
            name="ck_publishing_scheduled_is_approved",
        ),
    )
