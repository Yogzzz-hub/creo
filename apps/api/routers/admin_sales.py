from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import RequireAdmin
from models.enums import CustomPricingStatus
from models.custom_pricing import CustomPricing
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.custom_pricing import AdminCustomPricingResponse, CustomPricingCreate, CustomPricingOut
from schemas.sales import CustomPricingApprovalRequest
from services.payments import create_custom_pricing_checkout

router = APIRouter(prefix="/api/v1/admin/custom-pricing", tags=["admin-sales"])


@router.post("", response_model=CustomPricingOut, status_code=status.HTTP_201_CREATED)
async def create_custom_pricing(
    payload: CustomPricingCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    plan_result = await db.execute(select(Plan).where(Plan.id == payload.plan_id))
    plan = plan_result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    pricing = CustomPricing(
        client_id=current_user.id,
        plan_id=payload.plan_id,
        custom_price=payload.custom_price,
        standard_price=payload.standard_price,
        discount_percent=payload.discount_percent,
        requested_by=current_user.id,
        notes=payload.notes,
        status=CustomPricingStatus.pending,
    )
    db.add(pricing)
    await db.commit()
    await db.refresh(pricing)
    return pricing


@router.get("", response_model=list[AdminCustomPricingResponse])
async def list_custom_pricing_requests(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomPricing)
        .options(selectinload(CustomPricing.plan), selectinload(CustomPricing.client))
        .order_by(CustomPricing.created_at.desc())
    )
    pricings = result.scalars().unique().all()

    responses = []
    for cp in pricings:
        user = cp.client
        plan = cp.plan

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

    user_result = await db.execute(select(User).where(User.id == pricing.client_id))
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found",
        )

    try:
        checkout = create_custom_pricing_checkout(user, float(pricing.custom_price), pricing_id)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {exc}",
        )

    checkout_url = checkout.get("short_url") or checkout.get("checkout_url")

    pricing.status = CustomPricingStatus.approved
    pricing.approved_by = current_user.id
    pricing.valid_from = datetime.now(timezone.utc).date()

    now = datetime.now(timezone.utc)

    new_subscription = Subscription(
        user_id=pricing.client_id,
        plan_id=pricing.plan_id,
        status="pending_payment",
        gateway="razorpay" if user.razorpay_customer_id else "stripe",
        gateway_subscription_id=f"custom_{pricing_id}",
        gateway_customer_id=user.stripe_customer_id or user.razorpay_customer_id or "pending",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db.add(new_subscription)
    await db.commit()
    await db.refresh(pricing)

    return {
        "status": "success",
        "message": "Custom pricing approved. Send the checkout link to the client.",
        "pricing_id": pricing.id,
        "subscription_id": new_subscription.id,
        "checkout_url": checkout_url,
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
