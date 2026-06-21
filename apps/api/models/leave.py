from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import LeaveStatus

if TYPE_CHECKING:
    from models.user import User
    from models.team import TeamMember


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    team_member_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("team_members.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, name="leave_status", create_type=False),
        nullable=False,
        default=LeaveStatus.pending,
        index=True,
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    team_member: Mapped["TeamMember"] = relationship("TeamMember", lazy="selectin")
    approver: Mapped[Optional["User"]] = relationship(
        "User", 
        foreign_keys=[approved_by], 
        lazy="selectin",
        overlaps="leave_requests_approved"
    )