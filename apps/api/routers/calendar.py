import random
from calendar import monthrange
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_active_client
from models.content_calendar import ContentCalendar
from models.enums import CalendarEntryStatus, DeliverableType
from models.user import User
from schemas.portal import CalendarEntryResponse

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


@router.get("", response_model=list[CalendarEntryResponse])
async def list_calendar_entries(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentCalendar)
        .where(ContentCalendar.client_id == current_user.id)
        .order_by(ContentCalendar.scheduled_date.asc())
    )
    entries = result.scalars().all()
    return entries


# ---------------------------------------------------------------------------
# Temporary dev endpoint — POST /api/v1/calendar/test-generate
# ---------------------------------------------------------------------------
class TestGenerateResponse(BaseModel):
    message: str
    entries_created: int


class TestResetResponse(BaseModel):
    message: str
    entries_deleted: int


# Pro plan quotas
PRO_QUOTAS = {
    DeliverableType.poster: 16,
    DeliverableType.reel: 12,
    DeliverableType.story: 20,
}

TOPICS = {
    DeliverableType.poster: [
        "Product Feature Highlight", "Customer Testimonial", "Behind the Scenes",
        "Promotional Offer", "Brand Story", "Industry Tips", "Team Spotlight",
        "Client Success", "Holiday Theme", "Seasonal Campaign", "Infographic",
        "Quote Graphic", "Event Announcement", "New Service Launch", "FAQ Graphic",
        "Motivational Post",
    ],
    DeliverableType.reel: [
        "Product Demo", "Day in the Life", "Tutorial Walkthrough",
        "Trending Audio Hook", "Customer Reaction", "Before & After",
        "Quick Tips", "Office Tour", "Event Recap", "Reel Challenge",
        "Service Breakdown", "Meet the Team",
    ],
    DeliverableType.story: [
        "Poll Question", "This or That", "Quick Update", "Countdown Timer",
        "Swipe Link", "Behind the Scenes Clip", "Meme Share",
        "Testimonial Screenshot", "Daily Prompt", "Product Teaser",
        "Flash Sale", "Q&A Sticker", "Quiz Time", "Shoutout",
        "Milestone Celebration", "Fun Fact", "Seasonal Greeting",
        "Work in Progress", "User Generated Content", "Throwback",
    ],
}


def _generate_entries_for_month(year: int, month: int, client_id: str) -> list[dict]:
    """Generate Pro plan calendar entries for a month, skipping first 7 days."""
    days_in_month = monthrange(year, month)[1]
    # Available slots: day 8 through end of month
    available_days = list(range(8, days_in_month + 1))

    # Build a pool of (type, day) pairs, then shuffle for natural spread
    pool: list[tuple[DeliverableType, int]] = []
    for dtype, count in PRO_QUOTAS.items():
        for _ in range(count):
            day = random.choice(available_days)
            pool.append((dtype, day))

    random.shuffle(pool)

    entries: list[dict] = []
    for dtype, day in pool:
        topic_list = TOPICS[dtype]
        entries.append(
            {
                "client_id": client_id,
                "scheduled_date": date(year, month, day),
                "deliverable_type": dtype,
                "content_topic": random.choice(topic_list),
                "status": CalendarEntryStatus.scheduled,
            }
        )

    return entries


@router.post(
    "/test-generate",
    response_model=TestGenerateResponse,
    status_code=status.HTTP_200_OK,
)
async def test_generate_calendar(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """Dev-only: synchronously generate Pro plan calendar entries for the
    current month. Clears any existing entries for this client first."""
    now = date.today()
    year, month = now.year, now.month

    # Clear existing entries for this client in the current month
    await db.execute(
        delete(ContentCalendar).where(
            ContentCalendar.client_id == current_user.id,
            ContentCalendar.scheduled_date >= date(year, month, 1),
            ContentCalendar.scheduled_date <= date(year, month, monthrange(year, month)[1]),
        )
    )

    rows = _generate_entries_for_month(year, month, current_user.id)
    for row in rows:
        db.add(ContentCalendar(**row))

    await db.commit()

    return TestGenerateResponse(
        message="Calendar entries generated successfully",
        entries_created=len(rows),
    )


@router.delete(
    "/test-reset",
    response_model=TestResetResponse,
    status_code=status.HTTP_200_OK,
)
async def test_reset_calendar(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """Dev-only: delete all calendar entries for the current client."""
    from sqlalchemy import func as sqlfunc

    result = await db.execute(
        select(sqlfunc.count()).select_from(ContentCalendar).where(
            ContentCalendar.client_id == current_user.id,
        )
    )
    count = result.scalar() or 0

    await db.execute(
        delete(ContentCalendar).where(
            ContentCalendar.client_id == current_user.id,
        )
    )
    await db.commit()

    return TestResetResponse(
        message="Calendar entries deleted successfully",
        entries_deleted=count,
    )
