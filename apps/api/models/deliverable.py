from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import DeliverableStatus

if TYPE_CHECKING:
    from models.user import User
    from models.team import TeamMember
    from models.task import Task
    from models.content_calendar import ContentCalendar


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    task_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False, index=True
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    submitted_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("team_members.id"), nullable=False, index=True
    )
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[DeliverableStatus] = mapped_column(
        Enum(DeliverableStatus, name="deliverable_status", create_type=False),
        nullable=False,
        default=DeliverableStatus.pending_approval,
        index=True,
    )
    revision_round: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_deliverable_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("deliverables.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rejected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    instagram_published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    instagram_post_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="deliverables")
    client: Mapped["User"] = relationship("User", back_populates="deliverables")
    submitter: Mapped["TeamMember"] = relationship("TeamMember", lazy="selectin")
    parent_deliverable: Mapped[Optional["Deliverable"]] = relationship(
        "Deliverable", remote_side="Deliverable.id", lazy="selectin"
    )
    revisions: Mapped[list["Deliverable"]] = relationship(
        "Deliverable", 
        remote_side="Deliverable.parent_deliverable_id", 
        lazy="selectin",
        overlaps="parent_deliverable"
    )
    comments: Mapped[list["DeliverableComment"]] = relationship(
        "DeliverableComment", back_populates="deliverable", lazy="selectin"
    )
    calendar_entries: Mapped[list["ContentCalendar"]] = relationship(
        "ContentCalendar", 
        foreign_keys="ContentCalendar.linked_deliverable_id", 
        lazy="selectin",
        overlaps="linked_deliverable"
    )


class DeliverableComment(Base):
    __tablename__ = "deliverable_comments"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    deliverable_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("deliverables.id"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_rejection_reason: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    deliverable: Mapped["Deliverable"] = relationship(
        "Deliverable", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", back_populates="deliverable_comments")