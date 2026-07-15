import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, encrypt_gateway_id, require_active_client
from models.enums import AccountStatus, PaymentGateway, PlanName
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.payments import PaymentHistoryResponse, PlanChangeRequest
from services.payments import (
    create_gateway_subscription,
    update_stripe_subscription_plan,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/history", response_model=list[PaymentHistoryResponse])
async def get_payment_history(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
    )
    rows = result.all()

    return [
        PaymentHistoryResponse(
            id=sub.id,
            plan_id=sub.plan_id,
            amount=float(plan.monthly_price),
            status=sub.status,
            gateway=sub.gateway,
            gateway_subscription_id=sub.gateway_subscription_id,
            gateway_customer_id=sub.gateway_customer_id,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancelled_at=sub.cancelled_at,
            created_at=sub.created_at,
            updated_at=sub.updated_at,
        )
        for sub, plan in rows
    ]


@router.post("/change-plan")
async def change_plan(
    payload: PlanChangeRequest,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    plan_result = await db.execute(
        select(Plan).where(Plan.id == payload.new_plan_id)
    )
    new_plan = plan_result.scalar_one_or_none()

    if new_plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    if not new_plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan is not active",
        )

    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status.in_(["active", "pending_payment"]),
        ).order_by(Subscription.created_at.desc())
    )
    subscription = sub_result.scalar_one_or_none()

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found. Please create a new subscription first.",
        )

    if subscription.plan_id == new_plan.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already on this plan.",
        )

    try:
        if subscription.gateway == PaymentGateway.stripe:
            plan_id_map = {
                "starter": settings.RAZORPAY_STARTER_PLAN_ID,
                "growth": settings.RAZORPAY_GROWTH_PLAN_ID,
                "pro": settings.RAZORPAY_PRO_PLAN_ID,
            }
            stripe_price_id = plan_id_map.get(new_plan.name.value)
            if not stripe_price_id:
                raise ValueError(f"Missing Stripe price mapping for plan: {new_plan.name.value}")

            await run_in_threadpool(
                update_stripe_subscription_plan,
                subscription.gateway_subscription_id,
                stripe_price_id,
            )

        elif subscription.gateway == PaymentGateway.razorpay:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Razorpay does not support in-place plan changes. "
                    "Please contact support to switch plans."
                ),
            )

        subscription.plan_id = new_plan.id
        current_user.plan_name = PlanName(new_plan.name.value)
        db.add(subscription)
        db.add(current_user)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Plan change failed for user {current_user.id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update subscription with payment gateway. Please try again or contact support.",
        )

    return {
        "status": "success",
        "message": f"Plan changed to {new_plan.display_name}. Proration applied to next billing cycle.",
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
    current_user: Annotated[User, Depends(require_active_client)],
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
        current_user.razorpay_customer_id = encrypt_gateway_id(result["gateway_customer_id"])
    elif current_user.stripe_customer_id is None and result["gateway"] == "stripe":
        current_user.stripe_customer_id = encrypt_gateway_id(result["gateway_customer_id"])

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
