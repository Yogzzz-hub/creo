from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.user import User


class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    industry: Mapped[str] = mapped_column(Text, nullable=False)
    business_description: Mapped[str] = mapped_column(Text, nullable=False)
    target_audience: Mapped[dict] = mapped_column(JSONB, nullable=False)
    social_handles: Mapped[dict] = mapped_column(JSONB, nullable=False)
    current_posting_frequency: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_what_works: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_what_doesnt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_goal: Mapped[str] = mapped_column(Text, nullable=False)
    brand_tone: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    competitor_refs: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text), nullable=True)
    topics_to_avoid: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    style_references: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text), nullable=True)
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ai_summary_line: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="questionnaire")
