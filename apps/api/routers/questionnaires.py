import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import limiter
from core.security import require_active_client
from models.questionnaire import Questionnaire
from models.user import User
from schemas.questionnaire import (
    QuestionnaireCreate,
    QuestionnaireOut,
    QuestionnaireStatusResponse,
    QuestionnaireUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/questionnaire",
    tags=["questionnaire"],
)


def trigger_ai_analysis(user_id: str) -> bool:
    """
    Trigger the background AI analysis task.

    Returns True if the task was successfully dispatched or executed
    locally as a fallback when Celery/Redis is temporarily unavailable.
    """
    try:
        from workers.ai_tasks import generate_ai_analysis

        generate_ai_analysis.delay(str(user_id))

        logger.info(
            "AI analysis task dispatched successfully for user %s",
            user_id,
        )

        return True

    except Exception as exc:
        logger.exception(
            "Failed to dispatch AI analysis task for user %s: %s",
            user_id,
            exc,
        )

        try:
            from workers.ai_tasks import generate_ai_analysis

            generate_ai_analysis(str(user_id))
            logger.info(
                "AI analysis executed synchronously as fallback for user %s",
                user_id,
            )
            return True
        except Exception as fallback_exc:
            logger.exception(
                "Synchronous AI fallback also failed for user %s: %s",
                user_id,
                fallback_exc,
            )
            return False


async def get_client_questionnaire(
    current_user: User,
    db: AsyncSession,
) -> Questionnaire | None:
    """
    Get the questionnaire belonging to the current client.
    """
    result = await db.execute(
        select(Questionnaire).where(
            Questionnaire.user_id == current_user.id
        )
    )

    return result.scalar_one_or_none()


def build_status_response(
    questionnaire: Questionnaire,
) -> QuestionnaireStatusResponse:
    """
    Build the questionnaire status response.

    If ai_summary_line is empty, the analysis is still pending.
    """
    if questionnaire.ai_summary_line is None:
        return QuestionnaireStatusResponse(
            status="pending",
            summary_line=None,
            submitted_at=questionnaire.submitted_at,
            is_locked=False,
        )

    return QuestionnaireStatusResponse(
        status="completed",
        summary_line=questionnaire.ai_summary_line,
        submitted_at=questionnaire.submitted_at,
        is_locked=False,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def submit_questionnaire(
    request: Request,
    payload: QuestionnaireCreate,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """
    Create the client's questionnaire for the first time.

    If the questionnaire already exists, the client should use PATCH
    to edit it rather than POSTing another questionnaire.
    """

    existing_q = await get_client_questionnaire(
        current_user,
        db,
    )

    if existing_q is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Questionnaire already exists. "
                "Use PATCH /api/v1/questionnaire to update it."
            ),
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

        # No analysis exists yet.
        ai_summary_line=None,
    )

    db.add(questionnaire)

    # Idempotently advance onboarding stage to 4 (Building your custom dashboard)
    if current_user.onboarding_stage < 4:
        current_user.onboarding_stage = 4
        db.add(current_user)

    await db.commit()
    await db.refresh(questionnaire)

    # Analysis is generated from the newly saved questionnaire.
    dispatched = trigger_ai_analysis(
        str(current_user.id)
    )

    if not dispatched:
        logger.warning(
            "Questionnaire saved, but AI analysis could not be dispatched "
            "for user %s",
            current_user.id,
        )

    return {
        "status": "success",
        "questionnaire_id": questionnaire.id,
        "analysis_status": "pending",
    }


@router.get(
    "",
    response_model=QuestionnaireOut,
)
async def get_questionnaire(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current client's questionnaire.
    """

    questionnaire = await get_client_questionnaire(
        current_user,
        db,
    )

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questionnaire not found",
        )

    return questionnaire


@router.get(
    "/status",
    response_model=QuestionnaireStatusResponse,
)
async def get_questionnaire_status(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current questionnaire and AI analysis status.
    """

    questionnaire = await get_client_questionnaire(
        current_user,
        db,
    )

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questionnaire not found",
        )

    return build_status_response(questionnaire)


@router.patch(
    "",
    response_model=QuestionnaireStatusResponse,
)
@limiter.limit("3/minute")
async def update_questionnaire(
    request: Request,
    payload: QuestionnaireUpdate,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing client questionnaire.

    Every questionnaire change invalidates the previous AI analysis
    and triggers a new analysis based on the latest responses.
    """

    questionnaire = await get_client_questionnaire(
        current_user,
        db,
    )

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Questionnaire not found. "
                "Submit the questionnaire first."
            ),
        )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Update only fields supplied by the client.
    for field, value in update_data.items():

        # Prevent accidental modification of protected fields.
        if field in {
            "id",
            "user_id",
            "submitted_at",
            "ai_summary_line",
        }:
            continue

        if hasattr(questionnaire, field):
            setattr(
                questionnaire,
                field,
                value,
            )

    # IMPORTANT:
    # The old analysis is no longer valid because questionnaire
    # responses have changed.
    questionnaire.ai_summary_line = None

    # Keep the original submission timestamp if desired.
    # If you want this to represent the most recent questionnaire
    # update instead, change this behavior.
    questionnaire.submitted_at = questionnaire.submitted_at or datetime.now(
        timezone.utc
    )

    await db.commit()
    await db.refresh(questionnaire)

    # Trigger analysis using the latest saved questionnaire data.
    dispatched = trigger_ai_analysis(
        str(current_user.id)
    )

    if not dispatched:
        logger.warning(
            "Questionnaire updated successfully, but AI analysis "
            "could not be dispatched for user %s",
            current_user.id,
        )

    # Always return pending immediately after a successful update.
    # The background worker will populate ai_summary_line later.
    return QuestionnaireStatusResponse(
        status="pending",
        summary_line=None,
        submitted_at=questionnaire.submitted_at,
        is_locked=False,
    )
