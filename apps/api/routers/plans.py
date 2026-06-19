from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.plan import Plan
from schemas.plan import PlanResponse

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])


@router.get("", response_model=list[PlanResponse])
async def list_active_plans(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.monthly_price)
    )
    plans = result.scalars().all()
    return plans
