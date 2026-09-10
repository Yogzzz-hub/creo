"""Fair Workload-Balanced Pod Dispatch & Feasible Cadence Scheduler (FWB-FCS).

Implements:
1. Impartial Team Lead / Pod selection (Min-WIP with Deterministic Round-Robin tie-breaker).
2. Capable member assignment based on skill matching and capacity headroom.
3. Feasible calendar and task pacing (working days only, 48h lead buffer, daily capacity caps).
4. Multi-party notification broadcasting (Client, Lead, Assignees, Admin).
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Plan, Subscription
from app.models.enums import DeliverableStatus, DeliverableType, TaskStatus, UserRole
from app.models.ops import Notification
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Deliverable, Task

logger = logging.getLogger("creo.dispatch")


def _add_business_days(start: date, days: int) -> date:
    """Add business days (Monday-Friday) to a given date."""
    cur = start
    added = 0
    while added < days:
        cur += timedelta(days=1)
        if cur.weekday() < 5:  # Monday to Friday
            added += 1
    return cur


def _subtract_business_days(start: date, days: int) -> date:
    """Subtract business days (Monday-Friday) from a given date."""
    cur = start
    subtracted = 0
    while subtracted < days:
        cur -= timedelta(days=1)
        if cur.weekday() < 5:
            subtracted += 1
    return cur


async def assign_client_and_generate_schedule(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> dict[str, Any]:
    """Execute impartial pod assignment and feasible calendar generation using unified dispatch engine."""
    from app.services.dispatch_engine import (
        approve_calendar_month,
        assign_pod,
        draft_month_calendar,
    )

    # 1. Assign Creative Pod (Durable ownership)
    pod = await assign_pod(db, client_id)

    # 2. Draft month's quota-driven schedule in client timezone
    slots = await draft_month_calendar(db, client_id)

    # 3. Materialize tasks and dispatch rolling 10-day window
    approval = await approve_calendar_month(db, client_id)

    return {
        "status": "assigned_and_scheduled",
        "client_id": str(client_id),
        "team_lead": {
            "id": str(pod["team_lead_id"]),
            "name": pod["team_lead_name"],
        },
        "video_editor": {
            "id": str(pod["editor_id"]) if pod.get("editor_id") else None,
            "name": pod["editor_name"],
        },
        "graphic_designer": {
            "id": str(pod["designer_id"]) if pod.get("designer_id") else None,
            "name": pod["designer_name"],
        },
        "total_scheduled": len(slots),
        "reels_count": sum(1 for s in slots if s.slot_kind == "reel"),
        "posters_count": sum(1 for s in slots if s.slot_kind in ["poster", "static_post"]),
        "stories_count": sum(1 for s in slots if s.slot_kind in ["story", "carousel"]),
        "approved_slots": approval.get("approved_slots", 0),
        "created_tasks": approval.get("created_tasks", 0),
        "dispatched_tasks": approval.get("dispatched_tasks", 0),
    }

