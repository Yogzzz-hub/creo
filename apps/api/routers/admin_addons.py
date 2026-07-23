from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.addon import Addon
from models.user import User
from models.enums import AddonStatus

router = APIRouter(prefix="/api/v1/admin", tags=["admin-addons"])


class AdminAddonResponse(BaseModel):
    id: str
    client_name: str
    client_id: str
    addon_type: str
    addon_name: str
    quantity: int
    price: float
    status: str
    requested_at: str
    completed_at: Optional[str] = None


@router.get("/addons", response_model=list[AdminAddonResponse])
async def list_admin_addons(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Addon).order_by(Addon.created_at.desc())
    )
    addons = result.scalars().all()

    response = []
    for a in addons:
        client_result = await db.execute(select(User).where(User.id == a.client_id))
        client = client_result.scalar_one_or_none()

        response.append(AdminAddonResponse(
            id=a.id,
            client_name=client.business_name or client.email if client else "Unknown",
            client_id=a.client_id,
            addon_type=a.deliverable_type.value if hasattr(a.deliverable_type, 'value') else str(a.deliverable_type),
            addon_name=f"{a.deliverable_type.value.title()} Add-on" if hasattr(a.deliverable_type, 'value') else "Add-on",
            quantity=a.quantity,
            price=float(a.unit_price),
            status=a.status.value if hasattr(a.status, 'value') else str(a.status),
            requested_at=a.created_at.isoformat() if a.created_at else "",
            completed_at=a.updated_at.isoformat() if a.updated_at else None,
        ))
    return response


@router.post("/addons/{addon_id}/complete")
async def complete_addon(
    addon_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Addon).where(Addon.id == addon_id))
    addon = result.scalar_one_or_none()
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on not found")

    addon.status = AddonStatus.completed
    await db.commit()
    return {"status": "completed"}
