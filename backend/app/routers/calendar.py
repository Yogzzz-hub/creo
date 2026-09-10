"""Calendar router: client and agency publishing schedule entries."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.work import ContentCalendar, Deliverable, Task

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/entries", response_model=list[dict[str, Any]])
async def get_calendar_entries(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retrieve scheduled and published content calendar entries with format metadata."""
    target_client_id = client_id or actor.client_id or actor.user_id

    # If client role, require active, unexpired subscription
    if actor.role == "client":
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, target_client_id)
        if not sub_check["is_active"]:
            return []

    stmt = (
        select(
            Deliverable,
            Task.deliverable_type,
            ContentCalendar.caption,
        )
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .outerjoin(ContentCalendar, ContentCalendar.deliverable_id == Deliverable.id)
        .where(Deliverable.client_id == target_client_id)
        .order_by(Deliverable.scheduled_at.asc().nulls_last(), Deliverable.created_at.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    calendar_list = []
    for d, d_type, caption in rows:
        sched_dt = d.scheduled_at or d.created_at
        type_str = "reel"
        if d_type:
            val = str(d_type.value if hasattr(d_type, "value") else d_type).lower()
            if "reel" in val or "video" in val:
                type_str = "reel"
            elif "carousel" in val or "story" in val:
                type_str = "story"
            else:
                type_str = "poster"
        elif "video" in d.file_type.lower() or "mp4" in d.file_type.lower():
            type_str = "reel"
        else:
            type_str = "poster"

        format_label = "Reel" if type_str == "reel" else "Poster" if type_str == "poster" else "Story"
        
        # Clean, human-friendly title
        if caption and not caption.startswith("Brand campaign"):
            topic_text = caption
        else:
            topic_text = f"Brand {format_label} · Scheduled Post"

        calendar_list.append({
            "id": str(d.id),
            "deliverable_id": str(d.id),
            "type": type_str,
            "format_label": format_label,
            "topic": topic_text,
            "title": topic_text,
            "date": sched_dt.strftime("%Y-%m-%d"),
            "scheduled_at": sched_dt.isoformat(),
            "scheduled_time": sched_dt.strftime("%I:%M %p"),
            "status": "approved" if d.status.value == "approved" else "scheduled" if d.status.value in ["draft", "pending_approval"] else d.status.value,
            "raw_status": d.status.value,
            "version": d.version,
            "thumbnail_url": d.file_url,
            "file_url": d.file_url,
            "file_type": d.file_type,
            "caption": caption or topic_text,
            "permalink": d.ig_permalink,
        })

    return calendar_list
