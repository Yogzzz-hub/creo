from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_client
from models.user import User

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


@router.post("/accept-terms")
async def accept_terms(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(updated_at=datetime.now(timezone.utc))
    )
    await db.commit()

    return {"status": "success", "message": "Terms accepted"}


@router.post("/pricing-help")
async def pricing_help(
    current_user: Annotated[User, Depends(require_client)],
):
    from workers.notification_tasks import notify_sales_pricing_issue

    notify_sales_pricing_issue.delay(current_user.id)

    return {"status": "success", "message": "Sales team notified"}
