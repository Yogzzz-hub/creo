from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import limiter
from core.security import require_client
from models.questionnaire import Questionnaire
from models.user import User
from schemas.questionnaire import QuestionnaireCreate, QuestionnaireStatusResponse, QuestionnaireUpdate

router = APIRouter(prefix="/api/v1/questionnaire", tags=["questionnaire"])

QUESTIONNAIRE_LOCK_DAYS = 7


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def submit_questionnaire(
    request: Request,
    payload: QuestionnaireCreate,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == current_user.id)
    )
    existing_q = existing.scalar_one_or_none()

    if existing_q is not None:
        if existing_q.submitted_at is not None:
            lock_expiry = existing_q.submitted_at + timedelta(days=QUESTIONNAIRE_LOCK_DAYS)
            if datetime.now(timezone.utc) > lock_expiry:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Questionnaire is locked. The 7-day edit window has expired. Please contact Support to make changes.",
                )
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

    is_locked = False
    if questionnaire.submitted_at is not None:
        lock_expiry = questionnaire.submitted_at + timedelta(days=QUESTIONNAIRE_LOCK_DAYS)
        is_locked = datetime.now(timezone.utc) > lock_expiry

    if questionnaire.ai_summary_line is None:
        return QuestionnaireStatusResponse(
            status="pending",
            summary_line=None,
            submitted_at=questionnaire.submitted_at,
            is_locked=is_locked,
        )

    return QuestionnaireStatusResponse(
        status="completed",
        summary_line=questionnaire.ai_summary_line,
        submitted_at=questionnaire.submitted_at,
        is_locked=is_locked,
    )


@router.patch("", response_model=QuestionnaireStatusResponse)
@limiter.limit("3/minute")
async def update_questionnaire(
    request: Request,
    payload: QuestionnaireUpdate,
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

    if questionnaire.submitted_at is not None:
        lock_expiry = questionnaire.submitted_at + timedelta(days=QUESTIONNAIRE_LOCK_DAYS)
        if datetime.now(timezone.utc) > lock_expiry:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Questionnaire is locked. The 7-day edit window has expired. Please contact Support to make changes.",
            )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    for field, value in update_data.items():
        setattr(questionnaire, field, value)

    await db.commit()

    is_locked = False
    if questionnaire.submitted_at is not None:
        lock_expiry = questionnaire.submitted_at + timedelta(days=QUESTIONNAIRE_LOCK_DAYS)
        is_locked = datetime.now(timezone.utc) > lock_expiry

    if questionnaire.ai_summary_line is None:
        return QuestionnaireStatusResponse(
            status="pending",
            summary_line=None,
            submitted_at=questionnaire.submitted_at,
            is_locked=is_locked,
        )

    return QuestionnaireStatusResponse(
        status="completed",
        summary_line=questionnaire.ai_summary_line,
        submitted_at=questionnaire.submitted_at,
        is_locked=is_locked,
    )
