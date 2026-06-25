import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import require_client
from models.addon import Addon, AddonPricing
from models.enums import AddonStatus, DeliverableType, PaymentGateway, TaskStatus
from models.task import Task
from models.user import User
from services.payments import create_razorpay_order

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/addons", tags=["addons"])

MONTHLY_ADDON_LIMITS = {
    DeliverableType.poster: 10,
    DeliverableType.reel: 10,
    DeliverableType.story: 10,
}


class AddonPricingResponse(BaseModel):
    id: str
    deliverable_type: DeliverableType
    unit_price: float
    is_active: bool

    model_config = {"from_attributes": True}


class AddonPurchaseRequest(BaseModel):
    deliverable_type: DeliverableType
    quantity: int = Field(..., ge=1, le=10)
    content_brief: str | None = None


class BatchAddonItem(BaseModel):
    deliverable_type: DeliverableType
    quantity: int = Field(..., ge=1, le=10)
    content_brief: str | None = None


class BatchAddonPurchaseRequest(BaseModel):
    items: list[BatchAddonItem] = Field(..., min_length=1, max_length=3)


async def _check_monthly_quota(
    db: AsyncSession,
    user_id: str,
    deliverable_type: DeliverableType,
    requested_qty: int,
) -> None:
    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if period_start.month == 12:
        period_end = period_start.replace(year=period_start.year + 1, month=1)
    else:
        period_end = period_start.replace(month=period_start.month + 1)

    result = await db.execute(
        select(func.coalesce(func.sum(Addon.quantity), 0)).where(
            Addon.client_id == user_id,
            Addon.deliverable_type == deliverable_type,
            Addon.status.in_([AddonStatus.pending, AddonStatus.approved, AddonStatus.completed]),
            Addon.created_at >= period_start,
            Addon.created_at < period_end,
        )
    )
    current_qty = result.scalar() or 0
    limit = MONTHLY_ADDON_LIMITS.get(deliverable_type, 10)

    if current_qty + requested_qty > limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Monthly limit for {deliverable_type.value} add-ons reached. "
                   f"You have {current_qty}/{limit} this month.",
        )


@router.get("/pricing", response_model=list[AddonPricingResponse])
async def get_addon_pricing(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AddonPricing).where(AddonPricing.is_active.is_(True))
    )
    return result.scalars().all()


@router.post("/purchase")
async def purchase_addon(
    payload: AddonPurchaseRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    pricing_result = await db.execute(
        select(AddonPricing).where(
            AddonPricing.deliverable_type == payload.deliverable_type,
            AddonPricing.is_active.is_(True),
        )
    )
    pricing = pricing_result.scalar_one_or_none()

    if pricing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Addon pricing not found for this deliverable type",
        )

    unit_price = float(pricing.unit_price)
    total_price = unit_price * payload.quantity

    await _check_monthly_quota(db, current_user.id, payload.deliverable_type, payload.quantity)

    try:
        order = await run_in_threadpool(
            create_razorpay_order,
            amount=total_price,
            currency="INR",
            receipt=f"addon_{current_user.id[:8]}",
            notes={
                "user_id": current_user.id,
                "deliverable_type": payload.deliverable_type.value,
                "quantity": str(payload.quantity),
            },
        )

        addon = Addon(
            client_id=current_user.id,
            deliverable_type=payload.deliverable_type,
            quantity=payload.quantity,
            unit_price=unit_price,
            total_price=total_price,
            status=AddonStatus.pending,
            gateway=PaymentGateway.razorpay,
            gateway_payment_id=order["id"],
        )
        db.add(addon)
        await db.flush()

        new_tasks = []
        for _ in range(payload.quantity):
            new_tasks.append(
                Task(
                    client_id=current_user.id,
                    deliverable_type=payload.deliverable_type,
                    content_brief=payload.content_brief or f"Add-on Order: {payload.deliverable_type.value}",
                    status=TaskStatus.pending,
                    priority=2,
                    is_addon=True,
                    addon_id=addon.id,
                )
            )
        db.add_all(new_tasks)

        await db.commit()
        await db.refresh(addon)

    except Exception as e:
        logger.error(f"Addon purchase failed for user {current_user.id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to process addon payment. No charges were made.",
        )

    return {
        "status": "success",
        "order_id": str(addon.id),
        "razorpay_order_id": order["id"],
        "total_price": total_price,
    }


@router.post("/purchase-batch")
async def purchase_addon_batch(
    payload: BatchAddonPurchaseRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    results = []
    total_amount = 0.0

    for item in payload.items:
        pricing_result = await db.execute(
            select(AddonPricing).where(
                AddonPricing.deliverable_type == item.deliverable_type,
                AddonPricing.is_active.is_(True),
            )
        )
        pricing = pricing_result.scalar_one_or_none()
        if pricing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Addon pricing not found for {item.deliverable_type.value}",
            )
        total_amount += float(pricing.unit_price) * item.quantity

    await db.commit()

    for item in payload.items:
        pricing_result = await db.execute(
            select(AddonPricing).where(
                AddonPricing.deliverable_type == item.deliverable_type,
                AddonPricing.is_active.is_(True),
            )
        )
        pricing = pricing_result.scalar_one_or_none()
        unit_price = float(pricing.unit_price)
        item_total = unit_price * item.quantity

        await _check_monthly_quota(db, current_user.id, item.deliverable_type, item.quantity)

        try:
            order = await run_in_threadpool(
                create_razorpay_order,
                amount=item_total,
                currency="INR",
                receipt=f"addon_{current_user.id[:8]}",
                notes={
                    "user_id": current_user.id,
                    "deliverable_type": item.deliverable_type.value,
                    "quantity": str(item.quantity),
                },
            )

            addon = Addon(
                client_id=current_user.id,
                deliverable_type=item.deliverable_type,
                quantity=item.quantity,
                unit_price=unit_price,
                total_price=item_total,
                status=AddonStatus.pending,
                gateway=PaymentGateway.razorpay,
                gateway_payment_id=order["id"],
            )
            db.add(addon)
            await db.flush()

            new_tasks = []
            for _ in range(item.quantity):
                new_tasks.append(
                    Task(
                        client_id=current_user.id,
                        deliverable_type=item.deliverable_type,
                        content_brief=item.content_brief or f"Add-on Order: {item.deliverable_type.value}",
                        status=TaskStatus.pending,
                        priority=2,
                        is_addon=True,
                        addon_id=addon.id,
                    )
                )
            db.add_all(new_tasks)
            await db.commit()
            await db.refresh(addon)

            results.append({
                "deliverable_type": item.deliverable_type.value,
                "quantity": item.quantity,
                "total_price": item_total,
                "razorpay_order_id": order["id"],
            })

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Batch addon purchase failed for user %s: %s", current_user.id, e)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to process addon payment. No charges were made.",
            )

    return {
        "status": "success",
        "items": results,
        "total_amount": total_amount,
    }
