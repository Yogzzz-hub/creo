from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.platform_settings import PlatformSettings

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSettings).where(PlatformSettings.id == "default")
    )
    settings = result.scalar_one_or_none()

    if not settings:
        return {"scarcity_slots_available": 5}

    return {"scarcity_slots_available": settings.scarcity_slots_available}
