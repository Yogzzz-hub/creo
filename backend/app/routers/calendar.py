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

    calendar_list: list[dict[str, Any]] = []
    seen_deliverable_ids: set[uuid.UUID] = set()

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


# ==============================================================================
# §9: OPS ROUTER & PORTAL ROUTER (Creo Content Calendar Engine)
# ==============================================================================

from datetime import date, datetime
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from app.models.calendar import ClientCycle, ShootDay
from app.services.calendar_engine import (
    approve_cycle,
    complete_shoot_day,
    decide_shoot_reschedule,
    generate_client_cycle,
    get_or_create_calendar_policy,
    request_shoot_reschedule,
    resolve_publish_at,
)

ops_router = APIRouter(prefix="/ops", tags=["Calendar Ops"])
portal_router = APIRouter(prefix="/portal", tags=["Calendar Portal"])


# --- Request Schemas ---

class GenerateCycleRequest(BaseModel):
    cycle_number: int = 1
    start_date: date | None = None
    plan_id: uuid.UUID | None = None
    carryover_credits: dict[str, int] | None = None


class MoveSlotRequest(BaseModel):
    publish_date: date
    time_str: str | None = None
    daypart: str | None = None


class RescheduleDecisionRequest(BaseModel):
    accept: bool
    note: str | None = None
    counter_proposal: datetime | None = None


class ShootCompleteRequest(BaseModel):
    footage_received_at: datetime | None = None


class RequestRescheduleRequest(BaseModel):
    requested_for: datetime
    reason: str


class CycleCommentRequest(BaseModel):
    slot_id: uuid.UUID | None = None
    body: str


# --- Ops Endpoints ---

@ops_router.post("/clients/{client_id}/cycles/generate", response_model=dict[str, Any])
async def ops_generate_cycle(
    client_id: uuid.UUID,
    payload: GenerateCycleRequest | None = None,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Generate draft cycle, shoot days, and slots under deterministic rules."""
    req = payload or GenerateCycleRequest()
    cycle, shoot_days, slots = await generate_client_cycle(
        db,
        client_id=client_id,
        cycle_number=req.cycle_number,
        start_date=req.start_date,
        plan_id=req.plan_id,
        carryover_credits=req.carryover_credits,
        created_by=actor.user_id,
    )
    return {
        "status": "draft_generated",
        "cycle_id": str(cycle.id),
        "cycle_number": cycle.cycle_number,
        "start_date": cycle.start_date.isoformat(),
        "end_date": cycle.end_date.isoformat(),
        "runway_start": cycle.runway_start.isoformat() if cycle.runway_start else None,
        "shoot_days": [
            {
                "id": str(s.id),
                "sequence": s.sequence,
                "scheduled_at": s.scheduled_at.isoformat(),
                "status": s.status,
            }
            for s in shoot_days
        ],
        "total_slots": len(slots),
        "reels": sum(1 for s in slots if s.slot_kind == "reel"),
        "posters": sum(1 for s in slots if s.slot_kind == "poster"),
        "stories": sum(1 for s in slots if s.slot_kind == "story"),
        "quota_snapshot": cycle.quota_snapshot,
    }


@ops_router.get("/cycles/{cycle_id}", response_model=dict[str, Any])
async def ops_get_cycle(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Fetch full cycle draft with all slots and shoot days for AM editing."""
    stmt = (
        select(ClientCycle)
        .options(
            selectinload(ClientCycle.slots),
            selectinload(ClientCycle.shoot_days),
        )
        .where(ClientCycle.id == cycle_id)
    )
    cycle = (await db.execute(stmt)).scalar_one_or_none()
    if not cycle:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Cycle not found")

    return {
        "id": str(cycle.id),
        "client_id": str(cycle.client_id),
        "cycle_number": cycle.cycle_number,
        "start_date": cycle.start_date.isoformat(),
        "end_date": cycle.end_date.isoformat(),
        "runway_start": cycle.runway_start.isoformat() if cycle.runway_start else None,
        "status": cycle.status,
        "quota_snapshot": cycle.quota_snapshot,
        "shoot_days": [
            {
                "id": str(s.id),
                "sequence": s.sequence,
                "scheduled_at": s.scheduled_at.isoformat(),
                "status": s.status,
                "duration_min": s.duration_min,
                "location": s.location,
            }
            for s in cycle.shoot_days
        ],
        "slots": [
            {
                "id": str(s.id),
                "slot_kind": s.slot_kind,
                "publish_date": s.publish_date.isoformat(),
                "publish_at": s.publish_at.isoformat() if s.publish_at else None,
                "daypart": s.daypart,
                "phase": s.phase,
                "slot_strategy": s.slot_strategy,
                "caption": s.caption,
                "status": s.status,
                "is_locked": s.is_locked,
            }
            for s in sorted(cycle.slots, key=lambda x: (x.publish_date, x.publish_at or x.scheduled_time))
        ],
    }


@ops_router.patch("/cycles/{cycle_id}/slots/{slot_id}", response_model=dict[str, Any])
async def ops_move_slot(
    cycle_id: uuid.UUID,
    slot_id: uuid.UUID,
    payload: MoveSlotRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """AM moves or updates a single draft slot."""
    from fastapi import HTTPException

    slot = await db.get(ContentCalendar, slot_id)
    if not slot or slot.cycle_id != cycle_id:
        raise HTTPException(status_code=404, detail="Slot not found in cycle")

    cycle = await db.get(ClientCycle, cycle_id)
    if not cycle or cycle.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft cycle slots can be modified.")

    policy_row = await get_or_create_calendar_policy(db, slot.client_id)
    tz_name = policy_row.timezone or "Asia/Kolkata"

    slot.publish_date = payload.publish_date
    if payload.daypart:
        slot.daypart = payload.daypart
    time_val = payload.time_str or "19:30"
    pub_at = resolve_publish_at(payload.publish_date, time_val, tz_name)
    slot.publish_at = pub_at
    slot.scheduled_time = pub_at

    await db.commit()
    await db.refresh(slot)
    return {
        "status": "slot_updated",
        "slot_id": str(slot.id),
        "publish_date": slot.publish_date.isoformat(),
        "publish_at": slot.publish_at.isoformat() if slot.publish_at else None,
    }


@ops_router.post("/cycles/{cycle_id}/publish-draft", response_model=dict[str, Any])
async def ops_publish_draft(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Send draft cycle to the client (transitions to 'client_review')."""
    from fastapi import HTTPException

    cycle = await db.get(ClientCycle, cycle_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    cycle.status = "client_review"
    await db.commit()
    return {"status": "client_review", "cycle_id": str(cycle.id)}


@ops_router.post("/shoots/{shoot_id}/decide", response_model=dict[str, Any])
async def ops_decide_shoot(
    shoot_id: uuid.UUID,
    payload: RescheduleDecisionRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Team decides on reschedule request with cascade and 48h guardrail."""
    shoot = await decide_shoot_reschedule(
        db,
        shoot_id=shoot_id,
        actor=actor,
        accept=payload.accept,
        note=payload.note,
        counter_proposal=payload.counter_proposal,
    )
    return {
        "status": shoot.status,
        "shoot_id": str(shoot.id),
        "scheduled_at": shoot.scheduled_at.isoformat(),
        "decision_note": shoot.decision_note,
    }


@ops_router.post("/shoots/{shoot_id}/complete", response_model=dict[str, Any])
async def ops_complete_shoot(
    shoot_id: uuid.UUID,
    payload: ShootCompleteRequest | None = None,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Mark shoot completed and record footage intake timestamp."""
    shoot = await complete_shoot_day(
        db,
        shoot_id=shoot_id,
        footage_received_at=payload.footage_received_at if payload else None,
    )
    return {
        "status": "completed",
        "shoot_id": str(shoot.id),
        "footage_received_at": shoot.footage_received_at.isoformat() if shoot.footage_received_at else None,
    }


# --- Portal Endpoints ---

@portal_router.get("/calendar", response_model=dict[str, Any])
async def portal_get_calendar(
    month: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Client portal view of current content calendar, shoot days, and carried credits."""
    target_id = actor.client_id or actor.user_id

    # 1. Fetch active, client_review, or latest cycle
    cycle_stmt = (
        select(ClientCycle)
        .options(
            selectinload(ClientCycle.slots),
            selectinload(ClientCycle.shoot_days),
        )
        .where(ClientCycle.client_id == target_id)
        .order_by(
            ClientCycle.status == "active",
            ClientCycle.status == "client_review",
            ClientCycle.created_at.desc(),
        )
        .limit(1)
    )
    cycle = (await db.execute(cycle_stmt)).scalar_one_or_none()

    carryover_msg: str | None = None
    if cycle and cycle.quota_snapshot:
        quotas = cycle.quota_snapshot.get("quotas", {})
        reel_cred = quotas.get("reel", {}).get("credited", 0)
        if reel_cred > 0:
            carryover_msg = (
                f"{reel_cred} reels carried into next cycle — your first month includes a production ramp."
            )

    slots_data: list[dict[str, Any]] = []
    shoot_data: list[dict[str, Any]] = []
    if cycle:
        slots_data = [
            {
                "id": str(s.id),
                "format": s.slot_kind,
                "publish_date": s.publish_date.isoformat(),
                "publish_at": s.publish_at.isoformat() if s.publish_at else None,
                "scheduled_time": s.publish_at.strftime("%I:%M %p") if s.publish_at else None,
                "daypart": s.daypart,
                "phase": s.phase,
                "strategy": s.slot_strategy,
                "caption": s.caption,
                "status": s.status,
                "is_locked": s.is_locked,
            }
            for s in sorted(cycle.slots, key=lambda x: (x.publish_date, x.publish_at or x.scheduled_time))
        ]
        shoot_data = [
            {
                "id": str(s.id),
                "sequence": s.sequence,
                "scheduled_at": s.scheduled_at.isoformat(),
                "status": s.status,
                "duration_min": s.duration_min,
                "location": s.location,
            }
            for s in cycle.shoot_days
        ]

    return {
        "client_id": str(target_id),
        "cycle": {
            "id": str(cycle.id) if cycle else None,
            "cycle_number": cycle.cycle_number if cycle else 1,
            "status": cycle.status if cycle else "none",
            "start_date": cycle.start_date.isoformat() if cycle else None,
            "end_date": cycle.end_date.isoformat() if cycle else None,
            "runway_start": cycle.runway_start.isoformat() if cycle and cycle.runway_start else None,
            "quota_snapshot": cycle.quota_snapshot if cycle else None,
        } if cycle else None,
        "carryover_message": carryover_msg,
        "shoot_days": shoot_data,
        "slots": slots_data,
    }


@portal_router.post("/cycles/{cycle_id}/approve", response_model=dict[str, Any])
async def portal_approve_cycle(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Client approves calendar cycle, locking slots and generating production tasks."""
    return await approve_cycle(db, cycle_id, actor)


@portal_router.post("/cycles/{cycle_id}/comment", response_model=dict[str, Any])
async def portal_comment_cycle(
    cycle_id: uuid.UUID,
    payload: CycleCommentRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Client leaves feedback or comment on cycle or individual slot."""
    from app.models.ops import Notification

    notif = Notification(
        id=uuid.uuid4(),
        user_id=actor.user_id,
        title="Client Calendar Feedback",
        message=f"Comment on cycle {cycle_id}: {payload.body}",
    )
    db.add(notif)
    await db.commit()
    return {"status": "comment_received", "cycle_id": str(cycle_id), "slot_id": str(payload.slot_id) if payload.slot_id else None}


@portal_router.post("/shoots/{shoot_id}/request-reschedule", response_model=dict[str, Any])
async def portal_request_reschedule(
    shoot_id: uuid.UUID,
    payload: RequestRescheduleRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Client requests a shoot day reschedule."""
    target_id = actor.client_id or actor.user_id
    shoot = await request_shoot_reschedule(
        db,
        shoot_id=shoot_id,
        client_id=target_id,
        requested_for=payload.requested_for,
        reason=payload.reason,
    )
    return {
        "status": shoot.status,
        "shoot_id": str(shoot.id),
        "requested_for": shoot.requested_for.isoformat() if shoot.requested_for else None,
        "reason": shoot.request_reason,
    }

