from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import DeliverableType, TaskStatus

if TYPE_CHECKING:
    from models.user import User
    from models.team import TeamMember
    from models.content_calendar import ContentCalendar
    from models.deliverable import Deliverable
    from models.addon import Addon


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("team_members.id"), nullable=True, index=True
    )
    assigned_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    deliverable_type: Mapped[DeliverableType] = mapped_column(
        Enum(DeliverableType, name="deliverable_type", create_type=False), nullable=False
    )
    content_brief: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status", create_type=False),
        nullable=False,
        default=TaskStatus.pending,
        index=True,
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_addon: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    addon_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("addons.id"), nullable=True
    )
    calendar_entry_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("content_calendar.id"), nullable=True, index=True
    )
    assignment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    client: Mapped["User"] = relationship(
        "User", back_populates="tasks_as_client", foreign_keys=[client_id]
    )
    assigned_to_member: Mapped[Optional["TeamMember"]] = relationship(
        "TeamMember", lazy="selectin"
    )
    assigned_by_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_by], lazy="selectin"
    )
    calendar_entry: Mapped[Optional["ContentCalendar"]] = relationship(
        "ContentCalendar", foreign_keys=[calendar_entry_id], back_populates="linked_task"
    )
    deliverables: Mapped[list["Deliverable"]] = relationship(
        "Deliverable", back_populates="task", lazy="selectin"
    )
    addon: Mapped[Optional["Addon"]] = relationship("Addon", lazy="selectin")
