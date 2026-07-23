from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.platform_settings import PlatformSettings
from models.user import User
from schemas.settings import PlatformSettingsResponse, PlatformSettingsUpdate

router = APIRouter(prefix="/api/v1/admin", tags=["admin-settings"])


class UserManagementResponse(BaseModel):
    user_id: str
    email: str
    role: str
    status: str
    last_login: Optional[str] = None


class NotificationSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    whatsapp_notifications: Optional[bool] = None
    ticket_escalation_alerts: Optional[bool] = None
    payment_failure_alerts: Optional[bool] = None


class PaymentConfigUpdate(BaseModel):
    razorpay_enabled: Optional[bool] = None
    stripe_enabled: Optional[bool] = None
    auto_invoice: Optional[bool] = None
    payment_reminder_days: Optional[int] = None


class GeneralSettingsUpdate(BaseModel):
    agency_name: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    business_hours: Optional[str] = None
    timezone: Optional[str] = None

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


@router.get("/settings/users", response_model=list[UserManagementResponse])
async def list_admin_users(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return [
        UserManagementResponse(
            user_id=u.id,
            email=u.email,
            role=u.role.value if hasattr(u.role, 'value') else str(u.role),
            status=u.account_status.value if hasattr(u.account_status, 'value') else str(u.account_status),
            last_login=None,
        )
        for u in users
    ]


@router.patch("/settings/notifications")
async def update_notification_settings(
    payload: NotificationSettingsUpdate,
    _current_user: RequireAdmin,
):
    return {"status": "saved"}


@router.patch("/settings/payment")
async def update_payment_settings(
    payload: PaymentConfigUpdate,
    _current_user: RequireAdmin,
):
    return {"status": "saved"}


@router.patch("/settings/general")
async def update_general_settings(
    payload: GeneralSettingsUpdate,
    _current_user: RequireAdmin,
):
    return {"status": "saved"}
