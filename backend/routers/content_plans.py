from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, RequireAdmin
from models.content_plan import ContentPlan
from models.enums import ContentPlanStatus
from schemas.content_plan import ContentPlanCreate, ContentPlanOut

router = APIRouter(prefix="/api/v1/content-plans", tags=["content-plans"])


@router.get("", response_model=list[ContentPlanOut])
async def list_content_plans(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ("admin", "super_admin"):
        result = await db.execute(
            select(ContentPlan).order_by(ContentPlan.created_at.desc())
        )
    else:
        result = await db.execute(
            select(ContentPlan)
            .where(ContentPlan.client_id == current_user.id)
            .order_by(ContentPlan.created_at.desc())
        )
    return result.scalars().all()


@router.post("", response_model=ContentPlanOut, status_code=status.HTTP_201_CREATED)
async def create_content_plan(
    payload: ContentPlanCreate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(ContentPlan).where(
            ContentPlan.client_id == payload.client_id,
            ContentPlan.month == payload.month,
            ContentPlan.year == payload.year,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A content plan already exists for this client in {payload.month}/{payload.year}",
        )

    plan = ContentPlan(
        client_id=payload.client_id,
        month=payload.month,
        year=payload.year,
        pdf_url=payload.pdf_url,
        status=ContentPlanStatus.draft,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/{plan_id}/submit", response_model=ContentPlanOut)
async def submit_content_plan(
    plan_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentPlan).where(ContentPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content plan not found",
        )

    if plan.status != ContentPlanStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content plan is already {plan.status.value}",
        )

    plan.status = ContentPlanStatus.submitted
    plan.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/{plan_id}/approve", response_model=ContentPlanOut)
async def approve_content_plan(
    plan_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentPlan).where(ContentPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content plan not found",
        )

    if plan.status != ContentPlanStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content plan must be submitted before approval (current: {plan.status.value})",
        )

    plan.status = ContentPlanStatus.approved
    plan.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/{plan_id}/reject", response_model=ContentPlanOut)
async def reject_content_plan(
    plan_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentPlan).where(ContentPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content plan not found",
        )

    plan.status = ContentPlanStatus.rejected
    await db.commit()
    await db.refresh(plan)
    return plan
