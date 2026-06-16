from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser
from models.addon import Addon, AddonPricing
from models.enums import AddonStatus, DeliverableType

router = APIRouter(prefix="/api/v1/addons", tags=["addons"])


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


@router.get("/pricing", response_model=list[AddonPricingResponse])
async def get_addon_pricing(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AddonPricing).where(AddonPricing.is_active.is_(True))
    )
    return pricing


@router.post("/purchase")
async def purchase_addon(
    payload: AddonPurchaseRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    pricing_result = await db.execute(
        select(AddonPricing).where(
            AddonPricing.deliverable_type == payload.deliverable_type,
            AddonPricing.is_active.is_(True),
    )
    pricing = pricing_result.scalar_one_or_none()

    if pricing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Addon pricing not found for this deliverable type",
        )

    unit_price = float(pricing.unit_price)
    total_price = unit_price * payload.quantity

    addon = Addon(
        user_id=current_user.id,
        deliverable_type=payload.deliverable_type,
        quantity=payload.quantity,
        unit_price=unit_price,
        total_price=total_price,
        status=AddonStatus.pending,
        payment_id=f"mock_addon_pay_{uuid4().hex[:8]}",
    )

    db.add(addon)
    await db.commit()
    await db.refresh(addon)

    return {
        "status": "success",
        "order_id": str(addon.id),
        "total_price": total_price,
    }
