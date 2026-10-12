"""Portal dashboard router: client metrics, recent activity, and system announcements."""

from __future__ import annotations

import asyncio
import io
import mimetypes
import os
import uuid
from datetime import UTC, datetime, time, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.billing import PlanNegotiation
from app.models.enums import DeliverableStatus, TicketStatus, UserRole
from app.models.ops import Announcement, AuditLog, Notification
from app.models.pod_call import PodCallBooking
from app.models.support import Ticket
from app.models.user import ClientProfile, User
from app.models.work import ClientAssignment, Deliverable

router = APIRouter(prefix="/portal", tags=["Portal"])

_CALL_TIMEZONE = timezone(timedelta(hours=5, minutes=30))
_CALL_SLOT_TIMES = {
    0: time(10, 30),
    1: time(14, 0),
    2: time(11, 0),
    3: time(15, 30),
    4: time(10, 0),
}


class PodCallBookingRequest(BaseModel):
    starts_at: datetime


async def _get_client_and_pod_lead(actor: Actor, db: AsyncSession) -> tuple[User, User]:
    if actor.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can book a pod call.")

    client = await db.get(User, actor.user_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client account not found.")

    from app.services.onboarding_service import get_current_stage

    client_id = actor.client_id or actor.user_id
    if await get_current_stage(db, client_id) < 8:
        raise HTTPException(
            status_code=403,
            detail="Complete workspace setup before booking a pod call.",
        )

    result = await db.execute(
        select(ClientAssignment, User)
        .join(User, User.id == ClientAssignment.user_id)
        .where(ClientAssignment.client_id == client_id)
        .order_by(
            ClientAssignment.is_primary.desc(),
            (ClientAssignment.role == "team_lead").desc(),
            (ClientAssignment.role == "creative_lead").desc(),
        )
    )
    lead = next(
        (
            member
            for assignment, member in result.all()
            if assignment.is_primary or assignment.role in {"team_lead", "creative_lead"}
        ),
        None,
    )
    if not lead:
        raise HTTPException(status_code=409, detail="Your pod lead has not been assigned yet.")
    return client, lead


def _candidate_pod_call_slots(now: datetime, days: int = 45) -> list[datetime]:
    local_now = now.astimezone(_CALL_TIMEZONE)
    candidates: list[datetime] = []
    for offset in range(1, days + 1):
        slot_date = local_now.date() + timedelta(days=offset)
        if slot_date.weekday() not in _CALL_SLOT_TIMES:
            continue
        candidates.append(
            datetime.combine(
                slot_date,
                _CALL_SLOT_TIMES[slot_date.weekday()],
                tzinfo=_CALL_TIMEZONE,
            )
        )
    return candidates


def _format_call_slot(starts_at: datetime) -> dict[str, str]:
    local = starts_at.astimezone(_CALL_TIMEZONE)
    return {
        "id": local.isoformat(),
        "starts_at": local.isoformat(),
        "date_label": f"{local:%a, %b} {local.day}",
        "time_label": f"{local.strftime('%I:%M %p').lstrip('0')} IST",
    }


@router.get("/pod-calls/availability", response_model=dict[str, Any])
async def get_pod_call_availability(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List real, unbooked slots for this client's currently assigned pod lead."""
    client, lead = await _get_client_and_pod_lead(actor, db)
    now = datetime.now(UTC)
    result = await db.execute(
        select(PodCallBooking.starts_at).where(
            PodCallBooking.lead_id == lead.id,
            PodCallBooking.status == "booked",
            PodCallBooking.starts_at >= now,
        )
    )
    reserved = {int(starts_at.timestamp()) for starts_at in result.scalars().all()}
    slots = [
        _format_call_slot(candidate)
        for candidate in _candidate_pod_call_slots(now)
        if int(candidate.timestamp()) not in reserved
    ][:5]
    client_bookings = await db.execute(
        select(PodCallBooking.starts_at)
        .where(
            PodCallBooking.client_id == client.id,
            PodCallBooking.status == "booked",
            PodCallBooking.starts_at >= now,
        )
        .order_by(PodCallBooking.starts_at.asc())
    )

    return {
        "lead": {
            "id": str(lead.id),
            "name": lead.full_name or lead.email.split("@", 1)[0],
        },
        "slots": slots,
        "bookings": [_format_call_slot(starts_at) for starts_at in client_bookings.scalars().all()],
    }


@router.post("/pod-calls", response_model=dict[str, Any])
async def book_pod_call(
    payload: PodCallBookingRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Persist a 15-minute call and notify only the client and their assigned lead."""
    client, lead = await _get_client_and_pod_lead(actor, db)
    if payload.starts_at.tzinfo is None or payload.starts_at.utcoffset() is None:
        raise HTTPException(status_code=422, detail="A timezone-aware start time is required.")

    now = datetime.now(UTC)
    starts_at = payload.starts_at.astimezone(UTC)
    available_times = {candidate.astimezone(UTC) for candidate in _candidate_pod_call_slots(now)}
    if starts_at <= now or starts_at not in available_times:
        raise HTTPException(
            status_code=400,
            detail="That call slot is no longer available. Refresh and choose another time.",
        )

    existing = await db.execute(
        select(PodCallBooking.id).where(
            PodCallBooking.lead_id == lead.id,
            PodCallBooking.starts_at == starts_at,
            PodCallBooking.status == "booked",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="That call slot was just booked. Refresh and choose another time.",
        )

    booking_id = uuid.uuid4()
    booking = PodCallBooking(
        id=booking_id,
        agency_id=client.agency_id,
        client_id=client.id,
        lead_id=lead.id,
        starts_at=starts_at,
        duration_minutes=15,
        status="booked",
    )
    local_start = starts_at.astimezone(_CALL_TIMEZONE)
    time_label = local_start.strftime("%I:%M %p").lstrip("0")
    formatted_start = f"{local_start:%a, %b} {local_start.day} at {time_label} IST"
    client_name = client.full_name or client.email.split("@", 1)[0]
    agency_id = client.agency_id
    if lead.role == UserRole.TEAM_LEAD:
        lead_link = "/admin/pod-dashboard"
    elif lead.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES}:
        lead_link = "/admin"
    else:
        lead_link = "/workstation/overview"

    db.add(booking)
    db.add_all(
        [
            Notification(
                agency_id=agency_id,
                user_id=client.id,
                title="Your pod call is booked",
                message=(
                    f"Your 15-minute call with {lead.full_name or 'your pod lead'} "
                    f"is booked for {formatted_start}."
                ),
                link="/portal/creative-pod",
            ),
            Notification(
                agency_id=agency_id,
                user_id=lead.id,
                title="New pod call booking",
                message=f"{client_name} booked a 15-minute call with you for {formatted_start}.",
                link=lead_link,
            ),
        ]
    )
    db.add(
        AuditLog(
            agency_id=agency_id,
            actor_id=client.id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="pod_call_booking",
            entity_id=booking_id,
            action="booked",
            to_value={
                "client_id": str(client.id),
                "lead_id": str(lead.id),
                "starts_at": starts_at.isoformat(),
                "duration_minutes": 15,
            },
        )
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="That call slot was just booked. Refresh and choose another time.",
        ) from exc

    return {
        "id": str(booking_id),
        "starts_at": local_start.isoformat(),
        "lead_name": lead.full_name or lead.email.split("@", 1)[0],
        "message": (
            f"Your call with {lead.full_name or 'your pod lead'} "
            f"is booked for {formatted_start}."
        ),
    }


@router.get("/pod", response_model=dict[str, Any])
async def get_portal_pod(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return only the assigned pod members needed by the Creative Pod page."""
    if actor.role == "client":
        target_client_id = actor.client_id or actor.user_id
    else:
        target_client_id = client_id or actor.client_id or actor.user_id
    assignments = await db.execute(
        select(ClientAssignment, User)
        .join(User, User.id == ClientAssignment.user_id)
        .where(ClientAssignment.client_id == target_client_id)
        .order_by(
            ClientAssignment.is_primary.desc(),
            (ClientAssignment.role == "team_lead").desc(),
            (ClientAssignment.role == "creative_lead").desc(),
            (ClientAssignment.role == "video_editor").desc(),
        )
    )

    role_labels = {
        "team_lead": "Team Lead & Account Director",
        "video_editor": "Lead Video Editor (Reels & Motion)",
        "graphic_designer": "Lead Graphic Designer (Posters & Carousels)",
    }
    assigned_team = [
        {
            "id": str(user.id),
            "name": user.full_name or user.email.split("@")[0].capitalize(),
            "email": user.email,
            "raw_role": assignment.role,
            "role": role_labels.get(assignment.role, "Team Member"),
            "is_primary": assignment.is_primary,
        }
        for assignment, user in assignments.all()
    ]

    sa_stmt = (
        select(User)
        .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin"]))
        .order_by(User.created_at.asc())
        .limit(1)
    )
    sa_res = await db.execute(sa_stmt)
    sa = sa_res.scalar_one_or_none()
    super_admin_data = None
    if sa:
        super_admin_data = {
            "id": str(sa.id),
            "name": sa.full_name or "Creo Super Admin",
            "email": sa.email,
            "role": "Super Admin & Executive Escalations",
            "is_super_admin": True,
        }

    return {"assigned_team": assigned_team, "super_admin": super_admin_data}


@router.get("/dashboard", response_model=dict[str, Any])
async def get_portal_dashboard(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Fetch aggregated real-time dashboard data for a client."""
    from app.services.onboarding_service import get_current_stage

    current_stage: int | None = None
    if actor.role == "client":
        target_client_id = actor.client_id or actor.user_id
        current_stage = await get_current_stage(db, target_client_id)
        if current_stage < 8:
            # Full status is only needed to describe where to resume
            from app.services.onboarding_service import get_onboarding_status
            ob_status = await get_onboarding_status(db, target_client_id, known_stage=current_stage)
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "ONBOARDING_INCOMPLETE",
                    "message": "Onboarding must be completed before accessing the client portal.",
                    "stage": ob_status.stage,
                    "next_required_stage": ob_status.next_required_stage,
                    "next_route": ob_status.next_route,
                    "resume_section": ob_status.resume_section,
                },
            )
    else:
        target_client_id = client_id or actor.client_id or actor.user_id

    # If default actor ID was used and no client_id query param, pick the first client with deliverables
    if str(target_client_id) == "00000000-0000-0000-0000-000000000001":
        stmt_first = select(User.id).where(User.role == "client").limit(1)
        res_first = await db.execute(stmt_first)
        found_id = res_first.scalar_one_or_none()
        if found_id:
            target_client_id = found_id

    # 1. User profile and stage
    profile_row = (await db.execute(
        select(User, ClientProfile)
        .outerjoin(ClientProfile, ClientProfile.user_id == User.id)
        .where(User.id == target_client_id)
    )).first()
    user, profile = profile_row if profile_row else (None, None)

    # 2. Deliverables count pending approval
    deliv_stmt = select(func.count(Deliverable.id)).where(
        Deliverable.client_id == target_client_id,
        Deliverable.status == DeliverableStatus.PENDING_APPROVAL,
    )

    # 3. Open tickets count
    ticket_stmt = select(func.count(Ticket.id)).where(
        Ticket.client_id == target_client_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
    )
    counts = (await db.execute(select(deliv_stmt.scalar_subquery(), ticket_stmt.scalar_subquery()))).one()
    deliv_count, ticket_count = counts[0] or 0, counts[1] or 0

    # 4. Active subscription & plan (prioritize active/trialing)
    from app.services.subscription_guard import check_client_subscription

    sub_check = await check_client_subscription(db, target_client_id)
    sub = sub_check["subscription"]
    plan = sub_check["plan"]

    if current_stage is None:
        current_stage = await get_current_stage(db, target_client_id)

    active_plan = None
    if sub and plan and sub_check["is_active"]:
        active_plan = {
            "name": plan.display_name,
            "tier": plan.name,
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "monthly_price": float(sub.amount if sub.amount is not None else plan.monthly_price),
            "currency": plan.currency,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "is_active": True,
            "is_expired": False,
            "seconds_remaining": sub_check["seconds_remaining"],
            "days_remaining": sub_check["days_remaining"],
            "poster_quota": plan.poster_quota,
            "reel_quota": plan.reel_quota,
            "story_quota": plan.story_quota,
        }
    elif sub and plan and sub_check["is_expired"]:
        active_plan = {
            "name": plan.display_name,
            "tier": plan.name,
            "status": "expired",
            "monthly_price": float(sub.amount if sub.amount is not None else plan.monthly_price),
            "currency": plan.currency,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "is_active": False,
            "is_expired": True,
            "seconds_remaining": 0,
            "days_remaining": 0,
            "poster_quota": plan.poster_quota,
            "reel_quota": plan.reel_quota,
            "story_quota": plan.story_quota,
        }

    # 5. Recent deliverables for activity feed
    # Internal drafts and QA rejections are never shown to the client.
    from app.models.work import Task
    from app.services import deliverable_workflow

    recent_delivs_stmt = (
        select(Deliverable, Task)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(
            Deliverable.client_id == target_client_id,
            Deliverable.status.in_(list(deliverable_workflow.CLIENT_VISIBLE_STATUSES)),
        )
        .order_by(Deliverable.created_at.desc())
        .limit(5)
    )
    recent_delivs = (await db.execute(recent_delivs_stmt)).all()

    recent_activity = [
        {
            "id": str(d.id),
            "type": "deliverable",
            "title": f"{deliverable_workflow.deliverable_title(t, d)} v{d.version}",
            "status": d.status.value,
            "link": f"/portal/deliverables/{d.id}",
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d, t in recent_delivs
    ]

    # 6. Assigned creative pod / handlers
    ca_stmt = (
        select(ClientAssignment, User)
        .join(User, User.id == ClientAssignment.user_id)
        .where(ClientAssignment.client_id == target_client_id)
        .order_by(
            (ClientAssignment.role == "team_lead").desc(),
            (ClientAssignment.role == "video_editor").desc(),
        )
    )
    ca_res = await db.execute(ca_stmt)
    assigned_team = []
    for ca, u in ca_res.all():
        role_label = "Team Member"
        if ca.role == "team_lead":
            role_label = "Team Lead & Account Director"
        elif ca.role == "video_editor":
            role_label = "Lead Video Editor (Reels & Motion)"
        elif ca.role == "graphic_designer":
            role_label = "Lead Graphic Designer (Posters & Carousels)"
        assigned_team.append({
            "id": str(u.id),
            "name": u.full_name or u.email.split("@")[0].capitalize(),
            "email": u.email,
            "raw_role": ca.role,
            "role": role_label,
            "is_primary": ca.is_primary,
        })

    effective_account_status = (
        "active" if active_plan and current_stage >= 5
        else "pending_onboarding" if active_plan
        else "pending_payment"
    )

    return {
        "client_id": str(target_client_id),
        "full_name": user.full_name if user else "Client",
        "email": user.email if user else "",
        "company_name": profile.company_name if profile else None,
        "account_status": effective_account_status,
        "terms_accepted": profile.terms_accepted_at is not None if profile else False,
        "onboarding_stage": current_stage,
        "pending_deliverable_count": deliv_count,
        "open_ticket_count": ticket_count,
        "ai_summary_line": profile.brand_summary if profile else "",
        "brand_dna": profile.brand_dna if profile else {},
        "instagram_username": profile.instagram_username if profile else None,
        "active_plan": active_plan,
        "has_active_subscription": sub_check["is_active"],
        "is_subscription_expired": sub_check["is_expired"],
        "seconds_remaining": sub_check["seconds_remaining"],
        "days_remaining": sub_check["days_remaining"],
        "server_time_utc": sub_check["server_time_utc"],
        "recent_activity": recent_activity,
        "assigned_team": assigned_team,
    }


@router.get("/profile", response_model=dict[str, Any])
async def get_portal_profile(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve the client's business profile, security settings, and brand DNA."""
    client_id = actor.client_id or actor.user_id

    user_stmt = select(User).where(User.id == client_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    from app.models.questionnaire import Questionnaire
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    brand_dna_data = profile.brand_dna if profile and profile.brand_dna else {}
    two_fa = brand_dna_data.get("two_fa_enabled", False)
    phone = brand_dna_data.get("phone", "")

    # Query assigned creative pod
    ca_stmt = (
        select(ClientAssignment, User)
        .join(User, User.id == ClientAssignment.user_id)
        .where(ClientAssignment.client_id == client_id)
        .order_by(
            (ClientAssignment.role == "team_lead").desc(),
            (ClientAssignment.role == "video_editor").desc(),
        )
    )
    ca_res = await db.execute(ca_stmt)
    assigned_team = []
    for ca, u in ca_res.all():
        role_label = "Team Member"
        if ca.role == "team_lead":
            role_label = "Team Lead & Account Director"
        elif ca.role == "video_editor":
            role_label = "Lead Video Editor (Reels & Motion)"
        elif ca.role == "graphic_designer":
            role_label = "Lead Graphic Designer (Posters & Carousels)"
        assigned_team.append({
            "id": str(u.id),
            "name": u.full_name or u.email.split("@")[0].capitalize(),
            "email": u.email,
            "raw_role": ca.role,
            "role": role_label,
            "is_primary": ca.is_primary,
        })

    return {
        "full_name": user.full_name if user else "",
        "email": user.email if user else "",
        "phone": phone,
        "company_name": profile.company_name if profile else "",
        "instagram_username": profile.instagram_username if profile else "",
        "instagram_connected": profile.ig_connection_status == "connected" if profile else False,
        "two_fa_enabled": two_fa,
        "brand_summary": profile.brand_summary if profile else "",
        "brand_dna": brand_dna_data,
        "questionnaire_answers": quest.answers if quest else {},
        "assigned_team": assigned_team,
    }


@router.put("/profile", response_model=dict[str, Any])
async def update_portal_profile(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update client business and brand profile."""
    client_id = actor.client_id or actor.user_id

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    if not profile:
        profile = ClientProfile(user_id=client_id)
        db.add(profile)

    if "company_name" in body:
        profile.company_name = body["company_name"]
    if "instagram_username" in body:
        profile.instagram_username = body["instagram_username"]
    if "brand_summary" in body:
        profile.brand_summary = body["brand_summary"]
    if "brand_dna" in body and isinstance(body["brand_dna"], dict):
        profile.brand_dna = {**(profile.brand_dna or {}), **body["brand_dna"]}

    if "phone" in body:
        profile.brand_dna = {**(profile.brand_dna or {}), "phone": body["phone"]}

    if "full_name" in body:
        user_stmt = select(User).where(User.id == client_id)
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        if user:
            user.full_name = body["full_name"]

    # If questionnaire answers provided, update Questionnaire record too
    if "questionnaire_answers" in body and isinstance(body["questionnaire_answers"], dict):
        from app.models.questionnaire import Questionnaire
        q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
        quest = (await db.execute(q_stmt)).scalar_one_or_none()
        if quest:
            quest.answers = {**(quest.answers or {}), **body["questionnaire_answers"]}
        else:
            quest = Questionnaire(
                id=uuid.uuid4(),
                user_id=client_id,
                answers=body["questionnaire_answers"],
            )
            db.add(quest)

    await db.commit()

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "company_name": profile.company_name,
        "instagram_username": profile.instagram_username,
        "brand_summary": profile.brand_summary,
        "brand_dna": profile.brand_dna,
    }


@router.post("/change-password", response_model=dict[str, Any])
async def change_password(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Change client password with validation."""
    current_pass = body.get("current_password", "")
    new_pass = body.get("new_password", "")

    if not current_pass or not new_pass:
        return {"status": "error", "message": "Both current and new passwords are required."}

    if len(new_pass) < 6:
        return {"status": "error", "message": "New password must be at least 6 characters long."}

    client_id = actor.client_id or actor.user_id
    user = await db.get(User, client_id)
    if not user:
        return {"status": "error", "message": "User not found."}

    from app.core.security import hash_password, validate_password_strength, verify_password
    # Google-only accounts must prove email ownership (auth reset flow) to add a password.
    if not user.hashed_password:
        return {
            "status": "error",
            "message": "This account has no password yet. Use 'Set a password' to verify your email first.",
        }
    if not verify_password(current_pass, user.hashed_password):
        return {"status": "error", "message": "Current password is incorrect."}

    valid, err = validate_password_strength(new_pass)
    if not valid:
        return {"status": "error", "message": err}

    user.hashed_password = hash_password(new_pass)
    await db.commit()

    return {"status": "success", "message": "Password changed successfully."}


@router.patch("/2fa", response_model=dict[str, Any])
@router.post("/2fa", response_model=dict[str, Any])
@router.patch("/profile/2fa", response_model=dict[str, Any])
@router.post("/profile/2fa", response_model=dict[str, Any])
async def toggle_two_factor(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Toggle two-factor authentication for the client account."""
    enabled = bool(body.get("enabled", False))
    client_id = actor.client_id or actor.user_id

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile:
        profile = ClientProfile(user_id=client_id)
        db.add(profile)

    profile.brand_dna = {**(profile.brand_dna or {}), "two_fa_enabled": enabled}
    await db.commit()

    return {
        "status": "success",
        "two_fa_enabled": enabled,
        "message": "Two-factor authentication enabled." if enabled else "Two-factor authentication disabled.",
    }


@router.get("/brand-dna", response_model=dict[str, Any])
async def get_portal_brand_dna(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Read-only client view of synthesized Brand DNA."""
    target_id = client_id if (actor.role != "client" and client_id) else (actor.client_id or actor.user_id)
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == target_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    if not profile or not profile.brand_dna:
        from app.models.questionnaire import Questionnaire
        q_stmt = select(Questionnaire).where(Questionnaire.user_id == target_id)
        quest = (await db.execute(q_stmt)).scalar_one_or_none()
        if quest and quest.core_completed_at:
            from app.services import brand_dna
            dna = await brand_dna.run_brand_dna_pipeline(db, target_id)
            return {
                "brand_dna": dna.model_dump(),
                "brand_dna_source": profile.brand_dna_source if profile else "template",
                "brand_dna_version": profile.brand_dna_version if profile else 1,
                "summary_line": dna.summary_line,
            }
        return {
            "brand_dna": None,
            "brand_dna_source": "template",
            "brand_dna_version": 1,
            "summary_line": None,
        }

    return {
        "brand_dna": profile.brand_dna,
        "brand_dna_source": profile.brand_dna_source or "template",
        "brand_dna_version": profile.brand_dna_version or 1,
        "summary_line": profile.brand_summary or (profile.brand_dna.get("summary_line") if isinstance(profile.brand_dna, dict) else None),
    }


@router.post("/brand-dna/regenerate", response_model=dict[str, Any])
async def regenerate_brand_dna_profile(
    body: dict[str, Any],
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Regenerate Brand DNA analysis on demand using Gemini AI."""
    client_id = actor.client_id or actor.user_id
    from app.services import brand_dna

    new_dna = brand_dna.generate_deterministic_brand_dna(body)

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.brand_dna = new_dna.model_dump()
        profile.brand_summary = new_dna.summary_line
        await db.commit()

    return {
        "status": "success",
        "brand_dna": new_dna.model_dump(),
        "brand_summary": new_dna.summary_line,
        "message": "Brand strategy regenerated successfully.",
    }


@router.post("/brand/upload", response_model=dict[str, Any])
async def upload_brand_asset(
    file: UploadFile = File(...),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Upload a brand asset (vector mark, font, guideline PDF, image) to client profile."""
    client_id = actor.client_id or actor.user_id
    if not client_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    from app.services import storage_service

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile:
        profile = ClientProfile(user_id=client_id)
        db.add(profile)

    file_bytes = await file.read()
    size = len(file_bytes)
    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    mime_type = file.content_type or "application/octet-stream"
    if mime_type == "application/octet-stream" and file.filename:
        guessed, _ = mimetypes.guess_type(file.filename)
        if guessed:
            mime_type = guessed

    # Clean filename
    orig_name = os.path.basename(file.filename or "brand_asset")
    safe_name = "".join(c for c in orig_name if c.isalnum() or c in "._- ") or "brand_asset"
    storage_key = f"brand_assets/{client_id}/{uuid.uuid4().hex[:10]}_{safe_name}"

    try:
        fileobj = io.BytesIO(file_bytes)
        stored = await asyncio.to_thread(
            storage_service.put_object, storage_key, fileobj, mime_type, size
        )
    except Exception as exc:
        relative = os.path.join("uploads", "brand_assets", str(client_id), f"{uuid.uuid4().hex[:8]}_{safe_name}")
        destination = os.path.join(storage_service._LOCAL_STATIC_DIR, relative)
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        with open(destination, "wb") as out:
            out.write(file_bytes)
        stored = "/static/" + relative.replace(os.sep, "/")

    size_str = f"{size / (1024 * 1024):.1f} MB" if size >= 1024 * 1024 else f"{max(1, round(size / 1024))} KB"

    file_record = {
        "id": str(uuid.uuid4()),
        "name": safe_name,
        "url": stored,
        "file_url": stored,
        "size": size_str,
        "size_bytes": size,
        "mime_type": mime_type,
        "uploaded_at": datetime.now(UTC).isoformat(),
    }

    dna = dict(profile.brand_dna or {})
    existing_files = list(dna.get("files") or [])
    existing_files.insert(0, file_record)
    dna["files"] = existing_files
    profile.brand_dna = dna

    await db.commit()

    return {
        "status": "success",
        "message": f"'{safe_name}' uploaded successfully.",
        "file": file_record,
        "files": existing_files,
    }


@router.delete("/brand/files/{file_id}", response_model=dict[str, Any])
async def delete_brand_asset(
    file_id: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Remove an uploaded brand asset from the client profile."""
    client_id = actor.client_id or actor.user_id
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile or not profile.brand_dna:
        raise HTTPException(status_code=404, detail="File not found")

    dna = dict(profile.brand_dna or {})
    files_list = [f for f in (dna.get("files") or []) if f.get("id") != file_id]
    dna["files"] = files_list
    profile.brand_dna = dna
    await db.commit()

    return {
        "status": "success",
        "message": "File removed successfully.",
        "files": files_list,
    }




@router.get("/announcements", response_model=list[dict[str, Any]])
async def list_announcements(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Fetch active system announcements for the client portal."""
    stmt = (
        select(Announcement, User.full_name, User.email)
        .join(User, User.id == Announcement.author_id, isouter=True)
        .order_by(Announcement.created_at.desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "id": str(a.id),
            "title": a.title,
            "content": a.content,
            "type": a.type,
            "target_departments": a.target_departments or [],
            "author": author_name or author_email or "Creo Admin",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, author_name, author_email in rows
    ]


class PlanBargainCallRequest(BaseModel):
    target_topic: str = "Plan Pricing & Retainer Negotiation"
    proposed_offer: str | None = None
    phone_number: str
    preferred_time: str = "Immediate / ASAP"
    notes: str | None = None


@router.post("/book-call", response_model=dict[str, Any])
async def book_plan_bargain_call(
    payload: PlanBargainCallRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Client books a consultation/bargain call with Admin directly from client dashboard."""
    client_user = await db.get(User, actor.user_id)
    if not client_user:
        raise HTTPException(status_code=404, detail="User not found")

    client_name = client_user.full_name or client_user.email.split("@")[0]
    phone = payload.phone_number.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required to schedule a call.")

    # 1. Notify only this client's agency admins. Legacy unassigned accounts
    #    route to one platform super admin instead of broadcasting globally.
    admin_stmt = select(User.id).where(
        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.account_status == "active",
    )
    if client_user.agency_id:
        admin_stmt = admin_stmt.where(User.agency_id == client_user.agency_id)
    else:
        admin_stmt = (
            admin_stmt.where(User.role == UserRole.SUPER_ADMIN, User.agency_id.is_(None))
            .order_by(User.created_at.asc())
            .limit(1)
        )
    admin_res = await db.execute(admin_stmt)
    admin_ids = admin_res.scalars().all()

    if not admin_ids:
        fallback_admin = await db.execute(
            select(User.id)
            .where(
                User.role == UserRole.SUPER_ADMIN,
                User.account_status == "active",
            )
            .order_by(User.created_at.asc())
            .limit(1)
        )
        fallback_id = fallback_admin.scalar_one_or_none()
        if fallback_id:
            admin_ids = [fallback_id]

    notifs = []
    offer_str = f" • Proposed Offer: {payload.proposed_offer}" if payload.proposed_offer else ""
    notes_str = f" • Notes: {payload.notes}" if payload.notes else ""
    for aid in admin_ids:
        notifs.append(
            Notification(
                agency_id=client_user.agency_id,
                user_id=aid,
                title=f"📞 Plan Bargain Call: {client_name}",
                message=(
                    f"{client_name} ({client_user.email}) requested a call to bargain plan: "
                    f"{payload.target_topic}. Contact: {phone} "
                    f"(Preferred: {payload.preferred_time}){offer_str}{notes_str}"
                ),
                link="/admin/plans",
            )
        )
    if notifs:
        db.add_all(notifs)

    # 2. Add Audit Log
    db.add(
        AuditLog(
            agency_id=client_user.agency_id,
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="plan_bargain_call",
            entity_id=actor.user_id,
            action="book_bargain_call",
            to_value={
                "client_id": str(actor.user_id),
                "client_name": client_name,
                "phone": phone,
                "topic": payload.target_topic,
                "offer": payload.proposed_offer,
                "preferred_time": payload.preferred_time,
                "notes": payload.notes,
            },
        )
    )

    # 3. Create PlanNegotiation record so admin can see it on Plans & Negotiations page
    neg = PlanNegotiation(
        agency_id=client_user.agency_id,
        client_id=actor.user_id,
        client_name=client_name,
        client_email=client_user.email,
        target_topic=payload.target_topic,
        proposed_offer=payload.proposed_offer,
        phone_number=phone,
        preferred_time=payload.preferred_time,
        notes=payload.notes,
        status="Pending Review",
    )
    db.add(neg)

    await db.commit()

    return {
        "status": "call_requested",
        "client_name": client_name,
        "phone": phone,
        "topic": payload.target_topic,
        "message": (
            "Your agency team received the call request and will contact you "
            f"at {phone} ({payload.preferred_time})."
        ),
    }


@router.get("/negotiations", response_model=list[dict[str, Any]])
async def get_client_negotiations(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retrieve negotiation/bargain requests submitted by the authenticated client."""
    client_id = actor.client_id or actor.user_id
    stmt = (
        select(PlanNegotiation)
        .where(PlanNegotiation.client_id == client_id)
        .order_by(PlanNegotiation.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()
    return [
        {
            "id": str(n.id),
            "targetTopic": n.target_topic,
            "proposedOffer": n.proposed_offer,
            "phoneNumber": n.phone_number,
            "preferredTime": n.preferred_time,
            "notes": n.notes,
            "status": n.status,
            "counterPrice": n.counter_price,
            "counterNote": n.counter_note,
            "declineReason": n.decline_reason,
            "requestedAt": n.created_at.isoformat() if n.created_at else None,
            "reviewedAt": n.reviewed_at.isoformat() if n.reviewed_at else None,
        }
        for n in rows
    ]

