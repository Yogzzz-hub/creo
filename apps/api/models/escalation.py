from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.user import User
    from models.task import Task
    from models.ticket import Ticket


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False, default="low", index=True)
    client_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True
    )
    task_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=True, index=True
    )
    ticket_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tickets.id"), nullable=True
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active", index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    task: Mapped[Optional["Task"]] = relationship("Task", lazy="selectin")
    ticket: Mapped[Optional["Ticket"]] = relationship("Ticket", lazy="selectin")
    client: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[client_id],
        lazy="selectin",
        overlaps="escalations_as_client"
    )
    assigned_to_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[assigned_to],
        lazy="selectin",
        overlaps="escalations_assigned"
    )
    resolver: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[resolved_by],
        lazy="selectin"
    )