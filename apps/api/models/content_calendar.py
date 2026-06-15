from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import CalendarEntryStatus, DeliverableType

if TYPE_CHECKING:
    from models.user import User
    from models.content_plan import ContentPlan
    from models.task import Task
    from models.deliverable import Deliverable


class ContentCalendar(Base):
    __tablename__ = "content_calendar"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    content_plan_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("content_plans.id"), nullable=True, index=True
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    deliverable_type: Mapped[DeliverableType] = mapped_column(
        Enum(DeliverableType, name="deliverable_type", create_type=False), nullable=False
    )
    content_topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CalendarEntryStatus] = mapped_column(
        Enum(CalendarEntryStatus, name="calendar_entry_status", create_type=False),
        nullable=False,
        default=CalendarEntryStatus.draft,
    )
    linked_task_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=True, index=True
    )
    linked_deliverable_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("deliverables.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    client: Mapped["User"] = relationship("User", back_populates="content_calendar_entries")
    content_plan: Mapped[Optional["ContentPlan"]] = relationship(
        "ContentPlan", back_populates="calendar_entries"
    )
    linked_task: Mapped[Optional["Task"]] = relationship(
        "Task", foreign_keys=[linked_task_id], lazy="selectin"
    )
    linked_deliverable: Mapped[Optional["Deliverable"]] = relationship(
        "Deliverable", foreign_keys=[linked_deliverable_id], lazy="selectin"
    )
