from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser
from models.content_calendar import ContentCalendar
from schemas.portal import CalendarEntryResponse

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


@router.get("", response_model=list[CalendarEntryResponse])
async def list_calendar_entries(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentCalendar)
        .where(ContentCalendar.client_id == current_user.id)
        .order_by(ContentCalendar.scheduled_date.asc())
    )
    entries = result.scalars().all()
    return entries
