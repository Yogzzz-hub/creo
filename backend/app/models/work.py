"""Work domain models: tasks, deliverables, content_calendar, client_assignments."""

from __future__ import annotations

import uuid
from datetime import date, datetime
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
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DeliverableStatus, DeliverableType, TaskStatus, pg_enum

if TYPE_CHECKING:
    from app.models.calendar import ClientCycle, ShootDay
    from app.models.user import User


class Task(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "tasks"

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
        index=True,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    deliverable_type: Mapped[DeliverableType] = mapped_column(
        pg_enum(DeliverableType, "deliverable_type"), nullable=False
    )
    status: Mapped[TaskStatus] = mapped_column(
        pg_enum(TaskStatus, "task_status"),
        default=TaskStatus.BACKLOG,
        nullable=False,
        index=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sla_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_sla_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    effort_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_revision: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parent_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    preferred_sub_skill: Mapped[str | None] = mapped_column(String(50), nullable=True)
    concept_status: Mapped[str] = mapped_column(String(30), default="approved", nullable=False)
    blueprint: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)

    assignee: Mapped[User | None] = relationship(
        "User", foreign_keys=[assigned_to], back_populates="assigned_tasks"
    )
    parent_assignee: Mapped[User | None] = relationship(
        "User", foreign_keys=[parent_assignee_id]
    )
    deliverables: Mapped[list[Deliverable]] = relationship("Deliverable", back_populates="task")


class Deliverable(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deliverables"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    root_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id"),
        nullable=True,
    )
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[DeliverableStatus] = mapped_column(
        pg_enum(DeliverableStatus, "deliverable_status"),
        default=DeliverableStatus.PENDING_APPROVAL,
        nullable=False,
        index=True,
    )
    revision_round: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    revisions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliverables.id"),
        nullable=True,
    )
    rejection_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ig_creation_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ig_media_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ig_permalink: Mapped[str | None] = mapped_column(Text, nullable=True)
    publish_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    publish_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    client: Mapped[User] = relationship(
        "User", foreign_keys=[client_id], back_populates="deliverables"
    )
    task: Mapped[Task | None] = relationship("Task", back_populates="deliverables")
    parent: Mapped[Deliverable | None] = relationship("Deliverable", remote_side="Deliverable.id")

    __table_args__ = (
        UniqueConstraint("root_id", "version", name="uq_deliv_root_version"),
        Index(
            "uq_deliv_creation",
            "ig_creation_id",
            unique=True,
            postgresql_where=(ig_creation_id.isnot(None)),
        ),
        CheckConstraint(
            "status != 'scheduled' OR scheduled_at IS NOT NULL",
            name="ck_deliv_scheduled_has_time",
        ),
        Index("idx_deliv_due", "status", "scheduled_at"),
    )


class ContentCalendar(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "content_calendar"

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
        index=True,
    )
    deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliverables.id", ondelete="CASCADE"),
        nullable=True,
    )
    publish_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="approved", nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    slot_kind: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slot_strategy: Mapped[str] = mapped_column(String(20), default="anchor", nullable=False)
    flex_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    concept_status: Mapped[str] = mapped_column(String(30), default="approved", nullable=False)
    blueprint: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    selected_hook: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    cycle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_cycles.id", ondelete="CASCADE"),
        nullable=True,
    )
    shoot_day_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shoot_days.id", ondelete="SET NULL"),
        nullable=True,
    )
    publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    daypart: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phase: Mapped[str] = mapped_column(String(10), default="B", nullable=False)
    locked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    pillar: Mapped[str | None] = mapped_column(Text, nullable=True)
    funnel_stage: Mapped[str] = mapped_column(
        String(20), default="reach", nullable=False
    )
    slot_source: Mapped[str] = mapped_column(
        String(20), default="original", nullable=False
    )
    source_slot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("content_calendar.id", ondelete="SET NULL"),
        nullable=True,
    )
    story_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cycle: Mapped[ClientCycle | None] = relationship("ClientCycle", back_populates="slots")
    shoot_day: Mapped[ShootDay | None] = relationship("ShootDay", back_populates="slots")
    source_slot: Mapped[ContentCalendar | None] = relationship(
        "ContentCalendar", remote_side="ContentCalendar.id", foreign_keys=[source_slot_id]
    )

    __table_args__ = (
        CheckConstraint(
            "funnel_stage IN ('reach', 'authority', 'conversion')",
            name="ck_content_calendar_funnel",
        ),
        CheckConstraint(
            "slot_source IN ('original', 'repurpose')",
            name="ck_content_calendar_source",
        ),
        CheckConstraint(
            "story_role IS NULL OR story_role IN ('teaser', 'echo', 'standalone', 'coverage')",
            name="ck_content_calendar_story_role",
        ),
    )


class ClientAssignment(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "client_assignments"

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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    craft_role: Mapped[str] = mapped_column(
        String(30), default="graphic_designer", nullable=False,
    )
    points_committed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    from_team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    client: Mapped[User] = relationship(
        "User", foreign_keys=[client_id], back_populates="client_assignments"
    )

    __table_args__ = (
        Index(
            "uq_one_primary_am",
            "client_id",
            unique=True,
            postgresql_where=(role == "account_manager" and is_primary.is_(True)),
        ),
        Index(
            "uq_one_person_per_craft",
            "client_id", "craft_role",
            unique=True,
        ),
    )
