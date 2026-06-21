from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import CustomPricingStatus
from models.custom_pricing import CustomPricing
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.custom_pricing import AdminCustomPricingResponse
from schemas.sales import CustomPricingApprovalRequest

router = APIRouter(prefix="/api/v1/admin/custom-pricing", tags=["admin-sales"])


@router.get("", response_model=list[AdminCustomPricingResponse])
async def list_custom_pricing_requests(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomPricing).order_by(CustomPricing.created_at.desc())
    )
    pricings = result.scalars().all()

    responses = []
    for cp in pricings:
        user_result = await db.execute(select(User).where(User.id == cp.user_id))
        user = user_result.scalar_one_or_none()

        plan_result = await db.execute(select(Plan).where(Plan.id == cp.plan_id))
        plan = plan_result.scalar_one_or_none()

        responses.append(
            AdminCustomPricingResponse(
                id=cp.id,
                client_name=user.full_name if user else "Unknown",
                business_name=user.business_name if user else None,
                plan_name=plan.name.value if plan else None,
                custom_price=float(cp.custom_price),
                status=cp.status.value,
                reason=None,
                created_at=cp.created_at,
            )
        )

    return responses


@router.post("/{pricing_id}/approve")
async def approve_custom_pricing(
    pricing_id: str,
    payload: CustomPricingApprovalRequest,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomPricing).where(CustomPricing.id == pricing_id)
    )
    pricing = result.scalar_one_or_none()

    if pricing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom pricing request not found",
        )

    if pricing.status != CustomPricingStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Custom pricing request is already {pricing.status.value}",
        )

    pricing.status = CustomPricingStatus.approved
    pricing.approved_by = current_user.id
    pricing.valid_from = datetime.now(timezone.utc).date()

    plan_result = await db.execute(select(Plan).where(Plan.id == pricing.plan_id))
    plan = plan_result.scalar_one_or_none()

    user_result = await db.execute(select(User).where(User.id == pricing.user_id))
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found",
        )

    now = datetime.now(timezone.utc)
    gateway_sub_id = f"custom_{pricing_id}"
    gateway_customer_id = user.stripe_customer_id or user.razorpay_customer_id or "pending"

    new_subscription = Subscription(
        user_id=pricing.user_id,
        plan_id=pricing.plan_id,
        status="active",
        gateway="stripe",
        gateway_subscription_id=gateway_sub_id,
        gateway_customer_id=gateway_customer_id,
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db.add(new_subscription)

    await db.commit()
    await db.refresh(pricing)

    return {
        "status": "success",
        "message": "Custom pricing approved and subscription created",
        "pricing_id": pricing.id,
        "subscription_id": new_subscription.id,
        "admin_notes": payload.admin_notes,
    }


@router.post("/{pricing_id}/reject")
async def reject_custom_pricing(
    pricing_id: str,
    payload: CustomPricingApprovalRequest,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomPricing).where(CustomPricing.id == pricing_id)
    )
    pricing = result.scalar_one_or_none()

    if pricing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom pricing request not found",
        )

    if pricing.status != CustomPricingStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Custom pricing request is already {pricing.status.value}",
        )

    pricing.status = CustomPricingStatus.rejected
    pricing.approved_by = current_user.id

    await db.commit()
    await db.refresh(pricing)

    return {
        "status": "success",
        "message": "Custom pricing request rejected",
        "pricing_id": pricing.id,
        "admin_notes": payload.admin_notes,
    }
