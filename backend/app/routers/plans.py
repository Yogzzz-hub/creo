"""Plans router: exposes public active subscription tiers."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.billing import Plan

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("", response_model=list[dict[str, Any]])
async def list_plans(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Retrieve all active pricing tiers and quotas."""
    stmt = select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.price_minor.asc())
    res = await db.execute(stmt)
    plans = res.scalars().all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "display_name": p.display_name,
            "price_minor": p.price_minor,
            "monthly_price": float(p.monthly_price),
            "currency": p.currency,
            "poster_quota": p.poster_quota,
            "reel_quota": p.reel_quota,
            "story_quota": p.story_quota,
            "revision_rounds": p.revision_rounds,
            "has_dedicated_manager": p.has_dedicated_manager,
            "highlights": p.highlights or [],
            "is_recommended": p.is_recommended,
            "is_active": p.is_active,
            "scarcity_slots": p.scarcity_slots,
        }
        for p in plans
    ]
