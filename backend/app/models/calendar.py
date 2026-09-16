"""Calendar and Cycle models for the Creo Content Calendar Engine."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.billing import Plan
    from app.models.user import User
    from app.models.work import ContentCalendar


class ClientCycle(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "client_cycles"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id"),
        nullable=False,
    )
    runway_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    quota_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    policy_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    client: Mapped[User] = relationship("User", foreign_keys=[client_id])
    plan: Mapped[Plan] = relationship("Plan", foreign_keys=[plan_id])
    shoot_days: Mapped[list[ShootDay]] = relationship(
        "ShootDay", back_populates="cycle", cascade="all, delete-orphan"
    )
    slots: Mapped[list[ContentCalendar]] = relationship(
        "ContentCalendar", back_populates="cycle", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("client_id", "cycle_number", name="uq_cycle"),
        CheckConstraint("end_date = start_date + 29", name="ck_cycle_len"),
        Index(
            "uq_one_active_cycle",
            "client_id",
            unique=True,
            postgresql_where=(status.in_(["client_review", "active"])),
        ),
    )


class ShootDay(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "shoot_days"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_cycles.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=240, nullable=False)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="proposed", nullable=False)
    proposed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    request_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    footage_received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    cycle: Mapped[ClientCycle] = relationship("ClientCycle", back_populates="shoot_days")
    client: Mapped[User] = relationship("User", foreign_keys=[client_id])
    slots: Mapped[list[ContentCalendar]] = relationship(
        "ContentCalendar", back_populates="shoot_day"
    )

    __table_args__ = (
        Index(
            "idx_shoot_upcoming",
            "scheduled_at",
            postgresql_where=(status.in_(["proposed", "confirmed", "reschedule_requested"])),
        ),
    )


class CalendarPolicy(Base, TimestampMixin):
    __tablename__ = "calendar_policies"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    niche: Mapped[str] = mapped_column(Text, nullable=False)
    timezone: Mapped[str] = mapped_column(Text, default="Asia/Kolkata", nullable=False)
    policy: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="niche_template", nullable=False)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    client: Mapped[User] = relationship("User", foreign_keys=[client_id])


class CalendarBlackout(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "calendar_blackouts"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    blackout_on: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    client: Mapped[User | None] = relationship("User", foreign_keys=[client_id])

    __table_args__ = (Index("idx_blackout_lookup", "client_id", "blackout_on"),)
