from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_client
from models.questionnaire import Questionnaire
from models.user import User
from schemas.questionnaire import QuestionnaireCreate, QuestionnaireStatusResponse

router = APIRouter(prefix="/api/v1/questionnaire", tags=["questionnaire"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_questionnaire(
    payload: QuestionnaireCreate,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == current_user.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questionnaire already submitted",
        )

    questionnaire = Questionnaire(
        user_id=current_user.id,
        industry=payload.industry,
        business_description=payload.business_description,
        target_audience=payload.target_audience,
        social_handles=payload.social_handles,
        current_posting_frequency=payload.current_posting_frequency,
        content_what_works=payload.content_what_works,
        content_what_doesnt=payload.content_what_doesnt,
        primary_goal=payload.primary_goal,
        brand_tone=payload.brand_tone,
        competitor_refs=payload.competitor_refs,
        topics_to_avoid=payload.topics_to_avoid,
        style_references=payload.style_references,
        submitted_at=datetime.now(timezone.utc),
    )

    db.add(questionnaire)
    await db.commit()

    from workers.ai_tasks import generate_ai_analysis

    generate_ai_analysis.delay(str(current_user.id))

    return {"status": "success"}


@router.get("/status", response_model=QuestionnaireStatusResponse)
async def get_questionnaire_status(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == current_user.id)
    )
    questionnaire = result.scalar_one_or_none()

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questionnaire not found",
        )

    if questionnaire.ai_summary_line is None:
        return QuestionnaireStatusResponse(status="pending", summary_line=None)

    return QuestionnaireStatusResponse(
        status="completed",
        summary_line=questionnaire.ai_summary_line,
    )
