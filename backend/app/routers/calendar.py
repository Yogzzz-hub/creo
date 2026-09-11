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
            "calendar_status": cal.status or "approved",
            "is_locked": cal.is_locked or False,
            "slot_kind": cal.slot_kind,
            "slot_strategy": getattr(cal, "slot_strategy", "anchor"),
            "flex_deadline": cal.flex_deadline.strftime("%Y-%m-%d") if cal.flex_deadline else None,
            "concept_status": getattr(cal, "concept_status", "approved"),
            "blueprint": cal.blueprint,
            "selected_hook": cal.selected_hook,
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
            "calendar_status": "approved",
            "is_locked": True,
            "slot_kind": type_str,
            "raw_status": d.status.value,
            "version": d.version,
            "thumbnail_url": d.file_url,
            "file_url": d.file_url,
            "file_type": d.file_type,
            "caption": topic_text,
            "permalink": d.ig_permalink,
        })

    return calendar_list


@router.post("/draft-month", response_model=dict[str, Any])
@router.post("/{client_id}/draft-month", response_model=dict[str, Any])
async def draft_calendar_month_endpoint(
    client_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Generate quota-driven draft content calendar slots spread evenly across client template days."""
    target_id = client_id or actor.client_id or actor.user_id
    from app.services.dispatch_engine import draft_month_calendar

    slots = await draft_month_calendar(db, target_id)
    return {
        "status": "drafted",
        "client_id": str(target_id),
        "total_slots": len(slots),
        "reels": sum(1 for s in slots if s.slot_kind == "reel"),
        "posters": sum(1 for s in slots if s.slot_kind in ["poster", "static_post"]),
        "stories": sum(1 for s in slots if s.slot_kind in ["story", "carousel"]),
    }


@router.post("/approve", response_model=dict[str, Any])
@router.post("/{client_id}/approve", response_model=dict[str, Any])
async def approve_draft_calendar_endpoint(
    client_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Approve draft calendar slots, lock schedule, materialize tasks, and dispatch the rolling 10-day window."""
    target_id = client_id or actor.client_id or actor.user_id
    from app.services.dispatch_engine import approve_calendar_month

    res = await approve_calendar_month(db, target_id, actor_id=actor.user_id)
    return {
        "status": "approved",
        "client_id": str(target_id),
        **res,
    }


from pydantic import BaseModel


class ApproveConceptRequest(BaseModel):
    selected_hook: dict[str, Any]


class ProposeFlexRequest(BaseModel):
    theme: str
    urgency: str | None = None


@router.post("/slots/{slot_id}/approve-concept", response_model=dict[str, Any])
@router.post("/{client_id}/slots/{slot_id}/approve-concept", response_model=dict[str, Any])
async def approve_concept_endpoint(
    slot_id: uuid.UUID,
    payload: ApproveConceptRequest,
    client_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Tier 2: Client concept approval gate. Selects chosen hook A/B/C and unlocks task production."""
    target_id = client_id or actor.client_id or actor.user_id
    slot = await db.get(ContentCalendar, slot_id)
    if not slot or slot.client_id != target_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Calendar slot not found")

    slot.selected_hook = payload.selected_hook
    slot.concept_status = "concept_approved"

    # Also sync to any existing task for this slot (match by type + date proximity)
    from app.models.enums import DeliverableType, TaskStatus
    kind_to_type = {"reel": DeliverableType.REEL, "carousel": DeliverableType.CAROUSEL, "story": DeliverableType.STORY}
    slot_deliv_type = kind_to_type.get(slot.slot_kind or "", DeliverableType.STATIC_POST)
    task_stmt = (
        select(Task)
        .where(Task.client_id == target_id)
        .where(Task.deliverable_type == slot_deliv_type)
        .where(Task.due_date <= slot.publish_date)
        .where(Task.status.notin_([TaskStatus.COMPLETED]))
        .order_by(Task.due_date.desc())
        .limit(1)
    )
    task_res = (await db.execute(task_stmt)).scalars().first()
    if task_res:
        task_res.concept_status = "concept_approved"
        task_res.blueprint = slot.blueprint

    await db.commit()
    return {
        "status": "concept_approved",
        "slot_id": str(slot_id),
        "selected_hook": slot.selected_hook,
    }


@router.post("/slots/{slot_id}/reroll-concept", response_model=dict[str, Any])
@router.post("/{client_id}/slots/{slot_id}/reroll-concept", response_model=dict[str, Any])
async def reroll_concept_endpoint(
    slot_id: uuid.UUID,
    client_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Tier 2: Re-roll angle for a slot concept under capped daily quota (5 re-rolls/day)."""
    from fastapi import HTTPException
    target_id = client_id or actor.client_id or actor.user_id
    slot = await db.get(ContentCalendar, slot_id)
    if not slot or slot.client_id != target_id:
        raise HTTPException(status_code=404, detail="Calendar slot not found")

    from app.services.blueprint_service import check_and_increment_reroll_quota, generate_creative_blueprint
    from app.models.user import ClientProfile

    allowed, remaining = check_and_increment_reroll_quota(target_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Daily concept re-roll quota reached (5/5). Try again tomorrow.",
        )

    client_prof = await db.get(ClientProfile, target_id)
    brand_dna = client_prof.brand_dna if client_prof and client_prof.brand_dna else {}

    kind = slot.slot_kind or "reel"
    stage = "reach" if not slot.blueprint else slot.blueprint.get("funnel_stage", "reach")

    bp = await generate_creative_blueprint(brand_dna, kind, stage)
    bp_dict = bp.model_dump()

    slot.blueprint = bp_dict
    slot.selected_hook = bp_dict["hooks"][0] if bp_dict.get("hooks") else None
    slot.concept_status = "concept_pending"
    await db.commit()

    return {
        "status": "concept_rerolled",
        "slot_id": str(slot_id),
        "blueprint": bp_dict,
        "remaining_daily_rerolls": remaining,
    }


@router.post("/flex/{slot_id}/propose", response_model=dict[str, Any])
@router.post("/{client_id}/flex/{slot_id}/propose", response_model=dict[str, Any])
async def propose_flex_fill_endpoint(
    slot_id: uuid.UUID,
    payload: ProposeFlexRequest,
    client_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Tier 3: Hot-swap an open flex slot with a trending topic or announcement."""
    from fastapi import HTTPException
    target_id = client_id or actor.client_id or actor.user_id
    from app.services.dispatch_engine import propose_flex_fill

    slot = await propose_flex_fill(db, target_id, slot_id, theme=payload.theme, urgency=payload.urgency)
    if not slot:
        raise HTTPException(status_code=400, detail="Could not fill flex slot. Slot may not be flex or does not exist.")

    return {
        "status": "flex_swapped",
        "slot_id": str(slot_id),
        "slot_strategy": slot.slot_strategy,
        "blueprint": slot.blueprint,
    }
