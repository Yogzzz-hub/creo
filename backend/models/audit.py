from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.questionnaire import Questionnaire
    from models.user import User


class QuestionnaireAuditLog(Base):
    __tablename__ = "questionnaire_audit_logs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    questionnaire_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("questionnaires.id"), nullable=False, index=True
    )
    changed_by_user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    change_source: Mapped[str] = mapped_column(Text, nullable=False)
    old_ai_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_ai_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    old_summary_line: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_summary_line: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    questionnaire: Mapped["Questionnaire"] = relationship("Questionnaire")
    changed_by: Mapped[Optional["User"]] = relationship("User")
