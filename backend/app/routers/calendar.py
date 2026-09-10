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
    if actor.role == "client":
        target_client_id = actor.client_id or actor.user_id
    else:
        actual_client_id = client_id if isinstance(client_id, uuid.UUID) else None
        target_client_id = actual_client_id or actor.client_id or actor.user_id

    # If client role, require active, unexpired subscription
    if actor.role == "client":
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, target_client_id)
        if not sub_check["is_active"]:
            return []

    from datetime import datetime, timezone

    # 1. Query content calendar entries (joined with deliverables if already uploaded)
    stmt = (
        select(
            ContentCalendar,
            Deliverable,
            Task.deliverable_type,
        )
        .outerjoin(Deliverable, Deliverable.id == ContentCalendar.deliverable_id)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(ContentCalendar.client_id == target_client_id)
        .order_by(ContentCalendar.publish_date.asc(), ContentCalendar.scheduled_time.asc().nulls_last())
    )
    res = await db.execute(stmt)
    cal_rows = res.all()

    calendar_list = []
    seen_deliverable_ids = set()

    for cal, d, d_type in cal_rows:
        if d:
            seen_deliverable_ids.add(d.id)
        
        sched_dt = cal.scheduled_time or (
            datetime.combine(cal.publish_date, datetime.min.time(), tzinfo=timezone.utc)
            if cal.publish_date else datetime.now(timezone.utc)
        )
        
        caption = cal.caption or ""
        caption_lower = caption.lower()
        
        type_str = "reel"
        if d_type:
            val = str(d_type.value if hasattr(d_type, "value") else d_type).lower()
            if "reel" in val or "video" in val:
                type_str = "reel"
            elif "carousel" in val or "story" in val:
                type_str = "story"
            else:
                type_str = "poster"
        elif "reel" in caption_lower or (d and ("video" in (d.file_type or "").lower() or "mp4" in (d.file_type or "").lower())):
            type_str = "reel"
        elif "story" in caption_lower or "carousel" in caption_lower:
            type_str = "story"
        else:
            type_str = "poster"

        format_label = "Reel" if type_str == "reel" else "Poster" if type_str == "poster" else "Story"
        
        if caption and not caption.startswith("Brand campaign"):
            topic_text = caption
        else:
            topic_text = f"Brand {format_label} · Scheduled Post"

        status_val = "scheduled"
        if d:
            status_val = "approved" if d.status.value == "approved" else "scheduled" if d.status.value in ["draft", "pending_approval"] else d.status.value

        calendar_list.append({
            "id": str(cal.id),
            "deliverable_id": str(d.id) if d else None,
            "type": type_str,
            "format_label": format_label,
            "topic": topic_text,
            "title": topic_text,
            "date": cal.publish_date.strftime("%Y-%m-%d") if cal.publish_date else sched_dt.strftime("%Y-%m-%d"),
            "scheduled_at": sched_dt.isoformat(),
            "scheduled_time": sched_dt.strftime("%I:%M %p"),
            "status": status_val,
            "raw_status": d.status.value if d else "scheduled",
            "version": d.version if d else 1,
            "thumbnail_url": d.file_url if d else None,
            "file_url": d.file_url if d else None,
            "file_type": d.file_type if d else ("video/mp4" if type_str == "reel" else "image/jpeg"),
            "caption": caption or topic_text,
            "permalink": d.ig_permalink if d else None,
        })

    # 2. Also include any standalone deliverables that don't have a calendar row yet
    deliv_stmt = (
        select(Deliverable, Task.deliverable_type)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(Deliverable.client_id == target_client_id)
        .order_by(Deliverable.scheduled_at.asc().nulls_last(), Deliverable.created_at.asc())
    )
    deliv_rows = (await db.execute(deliv_stmt)).all()
    for d, d_type in deliv_rows:
        if d.id in seen_deliverable_ids:
            continue
        sched_dt = d.scheduled_at or d.created_at
        type_str = "reel"
        if d_type:
            val = str(d_type.value if hasattr(d_type, "value") else d_type).lower()
            type_str = "reel" if ("reel" in val or "video" in val) else "story" if ("carousel" in val or "story" in val) else "poster"
        elif "video" in (d.file_type or "").lower():
            type_str = "reel"
        else:
            type_str = "poster"

        format_label = "Reel" if type_str == "reel" else "Poster" if type_str == "poster" else "Story"
        topic_text = f"Brand {format_label} · Deliverable v{d.version}"

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
            "caption": topic_text,
            "permalink": d.ig_permalink,
        })

    return calendar_list
