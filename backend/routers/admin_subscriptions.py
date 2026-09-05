from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.custom_pricing import CustomPricing
from models.enums import CustomPricingStatus
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
    is_custom_pricing: bool = False
    custom_pricing_reason: Optional[str] = None


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

    # Look up the user to sync plan_name
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Resolve the target plan ────────────────────────────────────────
    plan: Plan | None = None

    if payload.plan_name:
        plan_result = await db.execute(
            select(Plan).where(Plan.name == payload.plan_name)
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            subscription.plan_id = plan.id
            # Sync the user's plan_name so quota lookups across the
            # system (dashboard, automation workers, middleware) see
            # the correct tier and its associated quotas
            # (poster_quota, reel_quota, story_quota live on the Plan row).
            user.plan_name = plan.name

    # If no plan change was requested, load the current plan for price checks
    if plan is None:
        current_plan_result = await db.execute(
            select(Plan).where(Plan.id == subscription.plan_id)
        )
        plan = current_plan_result.scalar_one_or_none()

    # ── Pricing validation ────────────────────────────────────────────
    custom_pricing_record = None

    if payload.monthly_price is not None and plan is not None:
        base_price = float(plan.monthly_price)

        if payload.monthly_price < base_price:
            # Enforce the custom pricing flag
            if not payload.is_custom_pricing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Price ₹{payload.monthly_price:,.0f} is below the "
                        f"{plan.display_name} standard of ₹{base_price:,.0f}. "
                        f"Enable 'Override Standard Pricing' to proceed."
                    ),
                )

            # Enforce a reason for the override
            if not payload.custom_pricing_reason or not payload.custom_pricing_reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A reason is required when overriding the standard price.",
                )

            # Create an auto-approved CustomPricing audit record
            discount_pct = round(
                ((base_price - payload.monthly_price) / base_price) * 100, 2
            )
            custom_pricing_record = CustomPricing(
                client_id=user_id,
                plan_id=plan.id,
                custom_price=payload.monthly_price,
                standard_price=base_price,
                discount_percent=discount_pct,
                requested_by=_current_user.id,
                approved_by=_current_user.id,
                status=CustomPricingStatus.approved,
                valid_from=datetime.now(timezone.utc).date(),
                notes=payload.custom_pricing_reason.strip(),
            )
            db.add(custom_pricing_record)

    await db.commit()

    response = {"status": "updated"}
    if custom_pricing_record is not None:
        await db.refresh(custom_pricing_record)
        response["custom_pricing_id"] = custom_pricing_record.id
        response["message"] = (
            f"Custom pricing approved: ₹{payload.monthly_price:,.0f} "
            f"(standard ₹{float(plan.monthly_price):,.0f})"
        )
    return response


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
