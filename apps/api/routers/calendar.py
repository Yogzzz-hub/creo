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



# Multi-tier quotas based on the client's subscription plan
PLAN_QUOTAS = {
    "basic": {
        DeliverableType.poster: 8,
        DeliverableType.reel: 4,
        DeliverableType.story: 10,
        DeliverableType.shoot_day: 2,
    },
    "pro": {
        DeliverableType.poster: 16,
        DeliverableType.reel: 12,
        DeliverableType.story: 20,
        DeliverableType.shoot_day: 6,
    },
    "enterprise": {
        DeliverableType.poster: 30,
        DeliverableType.reel: 25,
        DeliverableType.story: 40,
        DeliverableType.shoot_day: 12,
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


def _generate_entries_for_month(year: int, month: int, client_id: str, plan_tier: str = "pro") -> list[dict]:
    """Generate calendar entries for a month based on the client's specific plan tier."""
    days_in_month = monthrange(year, month)[1]
    available_days = list(range(8, days_in_month + 1))

    # Pick the quotas dynamically based on the plan tier (defaults to 'pro')
    quotas = PLAN_QUOTAS.get(plan_tier.lower(), PLAN_QUOTAS["pro"])

    pool: list[tuple[DeliverableType, int]] = []
    for dtype, count in quotas.items():
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
    """Dev-only: synchronously generate calendar entries based on the client's specific plan tier."""
    now = date.today()
    year, month = now.year, now.month

    # 1. Fetch the client's active content plan from the database to determine tier
    from sqlalchemy import select
    from models.content_plan import ContentPlan
    from models.plan import Plan # Adjust import if your plan table model name differs

    plan_tier = "pro" # Default fallback
    
    plan_result = await db.execute(
        select(ContentPlan).where(ContentPlan.client_id == current_user.id)
    );
    content_plan = plan_result.scalars().first()
    
    if content_plan:
        # If your content_plan relates to a plan or has a tier name field directly:
        plan_tier = getattr(content_plan, "tier_name", None) or getattr(current_user, "plan_tier", "pro")

    # 2. Clear existing entries for this client in the current month
    await db.execute(
        delete(ContentCalendar).where(
            ContentCalendar.client_id == current_user.id,
            ContentCalendar.scheduled_date >= date(year, month, 1),
            ContentCalendar.scheduled_date <= date(year, month, monthrange(year, month)[1]),
        )
    )

    # 3. Generate rows using the dynamically resolved plan tier
    rows = _generate_entries_for_month(year, month, current_user.id, plan_tier=plan_tier)
    for row in rows:
        db.add(ContentCalendar(**row))

    await db.commit()

    return TestGenerateResponse(
        message=f"Calendar entries successfully generated for {plan_tier} plan",
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
