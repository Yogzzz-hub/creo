from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.content_calendar import ContentCalendar
from models.user import User
from schemas.portal import CalendarEntryResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin-calendar"])


@router.get("/calendar", response_model=list[CalendarEntryResponse])
async def list_all_calendar_entries(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentCalendar).order_by(ContentCalendar.scheduled_date.asc())
    )
    return result.scalars().all()
