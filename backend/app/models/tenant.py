"""Tenant and agency organization models."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Agency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "agencies"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    custom_domain: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="trial", nullable=False)
    plan_tier: Mapped[str] = mapped_column(String(30), default="starter", nullable=False)
    max_clients: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_staff: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    branding: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)


class Team(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("agency_id", "name", name="uq_team_name"),)

    agency_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TeamMember(Base):
    __tablename__ = "team_members"

    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    is_home: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

