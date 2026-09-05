from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import CustomPricingStatus

if TYPE_CHECKING:
    from models.user import User
    from models.plan import Plan


class CustomPricing(Base):
    __tablename__ = "custom_pricing"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    plan_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), nullable=False
    )
    custom_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    standard_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    requested_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[CustomPricingStatus] = mapped_column(
        Enum(CustomPricingStatus, name="custom_pricing_status", create_type=False),
        nullable=False,
        default=CustomPricingStatus.pending,
        index=True,
    )
    valid_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    client: Mapped["User"] = relationship(
        "User",
        foreign_keys=[client_id],
        lazy="selectin",
        overlaps="custom_pricing_requests"
    )
    plan: Mapped["Plan"] = relationship("Plan", back_populates="custom_pricing")
    requester: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_by],
        lazy="selectin"
    )
    approver: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[approved_by],
        lazy="selectin",
        overlaps="custom_pricing_approved"
    )