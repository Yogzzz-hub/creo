from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireSales
from models.enums import UserRole
from models.user import User
from schemas.sales import CustomPricingRequestCreate, SalesClientResponse

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


@router.get("/clients", response_model=list[SalesClientResponse])
async def list_sales_clients(
    current_user: RequireSales,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.client, User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return [
        SalesClientResponse(
            user_id=u.id,
            full_name=u.full_name,
            business_name=u.business_name,
            plan_name=u.plan_name.value if u.plan_name else None,
            account_status=u.account_status.value,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/custom-pricing")
async def create_custom_pricing(
    payload: CustomPricingRequestCreate,
    current_user: RequireSales,
    db: AsyncSession = Depends(get_db),
):
    from models.custom_pricing import CustomPricing
    from models.enums import CustomPricingStatus

    client_result = await db.execute(
        select(User).where(User.id == payload.client_id, User.deleted_at.is_(None))
    )
    client = client_result.scalar_one_or_none()

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    custom_pricing = CustomPricing(
        user_id=payload.client_id,
        plan_id="00000000-0000-0000-0000-000000000000",
        custom_price=payload.proposed_monthly_price,
        status=CustomPricingStatus.pending,
    )

    db.add(custom_pricing)
    await db.commit()
    await db.refresh(custom_pricing)

    return {
        "status": "success",
        "message": "Custom pricing request submitted for admin approval",
        "id": custom_pricing.id,
    }
