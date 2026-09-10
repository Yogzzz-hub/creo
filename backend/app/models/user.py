"""User and Profile models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AccountStatus, UserRole, pg_enum

if TYPE_CHECKING:
    from app.models.billing import Subscription, UsageCounter
    from app.models.work import ClientAssignment, Deliverable, Task


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (Index("idx_users_role_created_at", "role", "created_at"),)

    auth_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        pg_enum(UserRole, "user_role"),
        default=UserRole.CLIENT,
        nullable=False,
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        pg_enum(AccountStatus, "account_status"),
        default=AccountStatus.PENDING_VERIFICATION,
        nullable=False,
    )
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    must_reset_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 1:1 Profiles
    client_profile: Mapped[ClientProfile | None] = relationship(
        "ClientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    staff_profile: Mapped[StaffProfile | None] = relationship(
        "StaffProfile",
        foreign_keys="StaffProfile.user_id",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Relationships
    subscriptions: Mapped[list[Subscription]] = relationship(
        "Subscription", back_populates="client", cascade="all, delete-orphan"
    )
    usage_counters: Mapped[list[UsageCounter]] = relationship(
        "UsageCounter", back_populates="client", cascade="all, delete-orphan"
    )
    deliverables: Mapped[list[Deliverable]] = relationship(
        "Deliverable", foreign_keys="Deliverable.client_id", back_populates="client"
    )
    assigned_tasks: Mapped[list[Task]] = relationship(
        "Task", foreign_keys="Task.assigned_to", back_populates="assignee"
    )
    client_assignments: Mapped[list[ClientAssignment]] = relationship(
        "ClientAssignment", foreign_keys="ClientAssignment.client_id", back_populates="client"
    )


class ClientProfile(Base, TimestampMixin):
    __tablename__ = "client_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instagram_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ig_token_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    ig_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    brand_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand_dna: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    calendar_template: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    terms_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    onboarding_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship("User", back_populates="client_profile")


class StaffProfile(Base, TimestampMixin):
    __tablename__ = "staff_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    department: Mapped[str] = mapped_column(String(50), default="creative", nullable=False)
    daily_capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    daily_points: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    last_assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    skills: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    is_accepting_work: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], back_populates="staff_profile")
    team_lead: Mapped[User | None] = relationship("User", foreign_keys=[team_lead_id])

