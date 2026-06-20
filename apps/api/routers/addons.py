from uuid import uuid4
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_client
from models.addon import Addon, AddonPricing
from models.enums import AddonStatus, DeliverableType
from models.user import User

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

    # 1. Create the Addon receipt
    addon = Addon(
        user_id=current_user.id,
        deliverable_type=payload.deliverable_type,
        quantity=payload.quantity,
        unit_price=unit_price,
        total_price=total_price,
        status=AddonStatus.pending, # Assuming mock payment is immediate, we could set this to completed
        payment_id=f"mock_addon_pay_{uuid4().hex[:8]}",
    )
    db.add(addon)
    await db.flush() # flush to get addon.id

    # 2. Automatically generate the actual Tasks for the creative team
    new_tasks = []
    for _ in range(payload.quantity):
        new_tasks.append(
            Task(
                client_id=current_user.id,
                deliverable_type=payload.deliverable_type,
                content_brief=payload.content_brief or f"Add-on Order: {payload.deliverable_type.value}",
                status=TaskStatus.pending, # Your auto-assign worker will pick this up!
                priority=2,
                is_addon=True,
                addon_id=addon.id,
            )
        )
    db.add_all(new_tasks)
    
    await db.commit()
    await db.refresh(addon)

    return {
        "status": "success",
        "order_id": str(addon.id),
        "total_price": total_price,
    }