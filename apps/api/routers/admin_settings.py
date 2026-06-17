from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.platform_settings import PlatformSettings
from schemas.settings import PlatformSettingsResponse, PlatformSettingsUpdate

router = APIRouter(prefix="/api/v1/admin", tags=["admin-settings"])

DEFAULT_SETTINGS_ID = "default"


@router.get("/settings", response_model=PlatformSettingsResponse)
async def get_platform_settings(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlatformSettings).where(PlatformSettings.id == DEFAULT_SETTINGS_ID)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        settings = PlatformSettings(id=DEFAULT_SETTINGS_ID)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


@router.patch("/settings", response_model=PlatformSettingsResponse)
async def update_platform_settings(
    payload: PlatformSettingsUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlatformSettings).where(PlatformSettings.id == DEFAULT_SETTINGS_ID)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        settings = PlatformSettings(id=DEFAULT_SETTINGS_ID)
        db.add(settings)
        await db.flush()

    if payload.sla_delivery_days is not None:
        settings.sla_delivery_days = payload.sla_delivery_days
    if payload.sla_revision_hours is not None:
        settings.sla_revision_hours = payload.sla_revision_hours

    await db.commit()
    await db.refresh(settings)

    return settings
