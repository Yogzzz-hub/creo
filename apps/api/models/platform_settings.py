from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class PlatformSettings(Base):
    __tablename__ = "platform_settings"

    id: Mapped[str] = mapped_column(
        Text, primary_key=True, default="default"
    )
    sla_delivery_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    sla_revision_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=48)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )
