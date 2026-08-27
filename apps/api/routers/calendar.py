import math
import random
from calendar import monthrange
from datetime import date, timedelta
from typing import Annotated

# pyrefly: ignore [missing-import]
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


class CalendarEntryUpdateRequest(BaseModel):
    scheduled_date: date | None = None
    deliverable_type: DeliverableType | None = None
    content_topic: str | None = None
    status: CalendarEntryStatus | None = None


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

    if not entries:
        from models.content_plan import ContentPlan
        
        plan_tier = "starter"  # Default fallback
        
        plan_result = await db.execute(
            select(ContentPlan).where(ContentPlan.client_id == current_user.id)
        )
        content_plan = plan_result.scalars().first()
        
        if content_plan:
            plan_tier = getattr(content_plan, "tier_name", None) or getattr(current_user, "plan_tier", "starter")
            
        rows = _generate_timeline_entries(current_user.id, plan_tier=plan_tier)
        for row in rows:
            db.add(ContentCalendar(**row))
            
        await db.commit()
        
        # Query again to get and return the newly generated entries
        result = await db.execute(
            select(ContentCalendar)
            .where(ContentCalendar.client_id == current_user.id)
            .order_by(ContentCalendar.scheduled_date.asc())
        )
        entries = result.scalars().all()

    return entries


@router.patch("/{entry_id}", response_model=CalendarEntryResponse)
async def update_calendar_entry(
    entry_id: str,
    payload: CalendarEntryUpdateRequest,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    
    result = await db.execute(
        select(ContentCalendar)
        .where(
            ContentCalendar.id == entry_id,
            ContentCalendar.client_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Calendar entry not found")
        
    if payload.scheduled_date is not None:
        entry.scheduled_date = payload.scheduled_date
    if payload.deliverable_type is not None:
        entry.deliverable_type = payload.deliverable_type
    if payload.content_topic is not None:
        entry.content_topic = payload.content_topic
    if payload.status is not None:
        entry.status = payload.status
        
    await db.commit()
    await db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Dev endpoint — POST /api/v1/calendar/test-generate
# ---------------------------------------------------------------------------
class TestGenerateResponse(BaseModel):
    message: str
    entries_created: int


class TestResetResponse(BaseModel):
    message: str
    entries_deleted: int


# Updated to match the specific UI Pricing names and quotas
PLAN_QUOTAS = {
    "starter": {
        DeliverableType.poster: 8,
        DeliverableType.reel: 4,
        DeliverableType.story: 10,
    },
    "growth": {
        DeliverableType.poster: 12,
        DeliverableType.reel: 8,
        DeliverableType.story: 15,
    },
    "pro": {
        DeliverableType.poster: 16,
        DeliverableType.reel: 12,
        DeliverableType.story: 20,
    }
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
    DeliverableType.shoot_day: [
        "BTS Shoot Day", "Product Photoshoot", "Brand Video Shoot",
        "Team Photoshoot", "Location Shoot", "Event Coverage",
        "Lifestyle Shoot", "Studio Session",
    ],
}


def _generate_timeline_entries(client_id: str, plan_tier: str = "starter") -> list[dict]:
    """Generates a 30-day active content timeline, starting after a 7-day onboarding period."""
    today = date.today()
    
    # Logic 1: Days 1-7 are Onboarding. The active 30-day calendar starts on Day 8.
    active_start_date = today + timedelta(days=7)
    
    # Logic 2: Create a pool of 30 distinct dates for the active plan duration
    available_dates = [active_start_date + timedelta(days=i) for i in range(30)]

    # Fetch quotas, default to 'starter' if the tier name doesn't match perfectly
    quotas = PLAN_QUOTAS.get(plan_tier.lower(), PLAN_QUOTAS["starter"]).copy()

    # Logic 3: Dynamically calculate shoot days based on reel count (4 reels = 2 shoot days)
    reels_count = quotas.get(DeliverableType.reel, 0)
    quotas[DeliverableType.shoot_day] = math.ceil(reels_count / 2)

    # Shuffle dates to ensure randomness
    random.shuffle(available_dates)
    date_pool = available_dates.copy()

    entries: list[dict] = []
    
    # Logic 4: Distribute items strictly one per day using list.pop() to prevent collisions
    for dtype, count in quotas.items():
        for _ in range(count):
            # Safety Fallback: If total plan items > 30 days (e.g., Pro Tier has 48 items),
            # we will run out of unique days. We recycle the dates to prevent server crashes.
            if not date_pool:
                date_pool = available_dates.copy()
                random.shuffle(date_pool)

            day = date_pool.pop()
            topic_list = TOPICS[dtype]
            entries.append(
                {
                    "client_id": client_id,
                    "scheduled_date": day,
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
    """Dev-only: synchronously generate 30-day calendar starting after 7-day onboarding."""
    now = date.today()

    # 1. Fetch the client's active content plan from the database to determine tier
    from sqlalchemy import select
    from models.content_plan import ContentPlan
    
    plan_tier = "starter"  # Default fallback
    
    plan_result = await db.execute(
        select(ContentPlan).where(ContentPlan.client_id == current_user.id)
    )
    content_plan = plan_result.scalars().first()
    
    if content_plan:
        plan_tier = getattr(content_plan, "tier_name", None) or getattr(current_user, "plan_tier", "starter")

    # 2. Clear existing future entries for this client to handle clean resets/month transitions
    await db.execute(
        delete(ContentCalendar).where(
            ContentCalendar.client_id == current_user.id,
            ContentCalendar.scheduled_date >= now,
        )
    )

    # 3. Generate rows using the new timeline logic
    rows = _generate_timeline_entries(current_user.id, plan_tier=plan_tier)
    for row in rows:
        db.add(ContentCalendar(**row))

    await db.commit()

    return TestGenerateResponse(
        message=f"Calendar timeline successfully generated for {plan_tier} plan",
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