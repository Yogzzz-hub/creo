from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import CurrentUser, require_client
from models.enums import AccountStatus, PaymentGateway, PlanName
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.payments import PaymentHistoryResponse, PlanChangeRequest
from services.payments import create_gateway_subscription

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/history", response_model=list[PaymentHistoryResponse])
async def get_payment_history(
    current_user: Annotated[User, Depends(require_client)],
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
    current_user: Annotated[User, Depends(require_client)],
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


class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    billing_country: str = "IN"


class CreateSubscriptionResponse(BaseModel):
    gateway: str
    subscription_id: str
    client_secret: str | None = None
    gateway_customer_id: str


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    payload: CreateSubscriptionRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    plan_result = await db.execute(
        select(Plan).where(Plan.id == payload.plan_id, Plan.is_active)
    )
    plan = plan_result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive",
        )

    existing_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.plan_id == plan.id,
            Subscription.status == "pending_payment",
        )
    )
    existing_subscription = existing_result.scalar_one_or_none()

    if existing_subscription:
        return CreateSubscriptionResponse(
            gateway=existing_subscription.gateway.value,
            subscription_id=existing_subscription.gateway_subscription_id,
            client_secret=None,
            gateway_customer_id=existing_subscription.gateway_customer_id,
        )

    result = await run_in_threadpool(
        create_gateway_subscription, current_user, plan, payload.billing_country
    )

    if current_user.razorpay_customer_id is None and result["gateway"] == "razorpay":
        current_user.razorpay_customer_id = result["gateway_customer_id"]
    elif current_user.stripe_customer_id is None and result["gateway"] == "stripe":
        current_user.stripe_customer_id = result["gateway_customer_id"]

    gateway = PaymentGateway(result["gateway"])

    subscription = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="pending_payment",
        gateway=gateway,
        gateway_subscription_id=result["subscription_id"],
        gateway_customer_id=result["gateway_customer_id"],
        current_period_start=result["current_period_start"],
        current_period_end=result["current_period_end"],
    )
    db.add(subscription)
    await db.commit()

    return CreateSubscriptionResponse(
        gateway=result["gateway"],
        subscription_id=result["subscription_id"],
        client_secret=result.get("client_secret"),
        gateway_customer_id=result["gateway_customer_id"],
    )
