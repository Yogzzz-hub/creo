from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.user import User
    from models.task import Task


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    task_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False, index=True
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open", index=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    task: Mapped["Task"] = relationship("Task", lazy="selectin")
    client: Mapped["User"] = relationship(
        "User", foreign_keys=[client_id], lazy="selectin"
    )
    assigned_to_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_to], lazy="selectin"
    )
