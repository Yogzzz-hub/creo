from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.subscription import Subscription
from models.plan import Plan
from models.user import User

router = APIRouter(prefix="/api/v1/admin", tags=["admin-subscriptions"])


class AdminSubscriptionResponse(BaseModel):
    user_id: str
    client_name: str
    business_name: Optional[str] = None
    plan_name: Optional[str] = None
    monthly_price: float
    status: str
    payment_status: str
    next_billing_date: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    plan_name: Optional[str] = None
    monthly_price: Optional[float] = None


@router.get("/subscriptions", response_model=list[AdminSubscriptionResponse])
async def list_admin_subscriptions(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).order_by(Subscription.created_at.desc())
    )
    subscriptions = result.scalars().all()

    response = []
    for s in subscriptions:
        user_result = await db.execute(select(User).where(User.id == s.user_id))
        user = user_result.scalar_one_or_none()

        plan_result = await db.execute(select(Plan).where(Plan.id == s.plan_id))
        plan = plan_result.scalar_one_or_none()

        response.append(AdminSubscriptionResponse(
            user_id=s.user_id,
            client_name=user.business_name or user.email if user else "Unknown",
            business_name=user.business_name if user else None,
            plan_name=plan.name.value if plan and hasattr(plan.name, 'value') else (plan.name if plan else None),
            monthly_price=float(plan.monthly_price) if plan else 0,
            status=s.status,
            payment_status=s.status,
            next_billing_date=s.current_period_end.isoformat() if s.current_period_end else None,
        ))
    return response


@router.patch("/subscriptions/{user_id}")
async def update_subscription(
    user_id: str,
    payload: SubscriptionUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
        )
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="Active subscription not found")

    if payload.plan_name:
        plan_result = await db.execute(
            select(Plan).where(Plan.name == payload.plan_name)
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            subscription.plan_id = plan.id

    await db.commit()
    return {"status": "updated"}


@router.get("/plans")
async def list_admin_plans(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).order_by(Plan.monthly_price.asc()))
    plans = result.scalars().all()

    return [
        {
            "id": p.id,
            "name": p.name.value if hasattr(p.name, 'value') else str(p.name),
            "display_name": p.display_name,
            "monthly_price": float(p.monthly_price),
            "is_active": p.is_active,
        }
        for p in plans
    ]
