from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, JSON, Numeric, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import PlanName

if TYPE_CHECKING:
    from models.subscription import Subscription
    from models.custom_pricing import CustomPricing


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    name: Mapped[PlanName] = mapped_column(
        Enum(PlanName, name="plan_name", create_type=False), unique=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    monthly_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    poster_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    reel_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    story_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    revision_rounds: Mapped[int] = mapped_column(Integer, nullable=False)
    has_dedicated_manager: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    highlights: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_recommended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="plan", lazy="selectin"
    )
    custom_pricing: Mapped[list["CustomPricing"]] = relationship(
        "CustomPricing", back_populates="plan", lazy="selectin"
    )
