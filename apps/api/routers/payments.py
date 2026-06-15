from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser
from models.enums import PlanName
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.payments import PaymentHistoryResponse, PlanChangeRequest

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/history", response_model=list[PaymentHistoryResponse])
async def get_payment_history(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
    )
    subscriptions = result.scalars().all()
    return subscriptions


@router.post("/change-plan")
async def change_plan(
    payload: PlanChangeRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    plan_result = await db.execute(
        select(Plan).where(Plan.id == payload.new_plan_id)
    )
    plan = plan_result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan is not active",
        )

    user_update = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = user_update.scalar_one()

    user.plan_name = PlanName(plan.name.value)
    await db.commit()

    return {
        "status": "success",
        "message": "Plan updated successfully. Proration applied to next billing cycle.",
    }
