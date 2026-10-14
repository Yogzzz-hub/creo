"""BDE (Business Development Executive) & Lead Management API router.

Endpoints:
- GET /bde/leads: List and filter prospects by priority, status, search, and follow-up timeline
- POST /bde/leads: Create a new prospective client
- GET /bde/leads/{id}: Retrieve detailed lead record and activity timeline
- PATCH /bde/leads/{id}: Update priority (Hot/Warm/Cold), conversion stage, deal value, or notes
- DELETE /bde/leads/{id}: Delete a lead
- POST /bde/leads/{id}/activities: Log call, WhatsApp chat, meeting, or follow-up commitment
- GET /bde/metrics: Aggregated conversion metrics, stage funnel, and pipeline value
- GET /bde/calendar: Schedule of upcoming, pending, and overdue follow-up calls
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rbac import (
    Actor,
    SalesActor,
    get_current_actor,
    require_roles,
)
from app.db.session import get_db
from app.models.crm import Lead, LeadActivity
from app.models.enums import UserRole
from app.models.ops import Notification
from app.models.user import User

router = APIRouter(prefix="/bde", tags=["BDE & Lead Management"])

# BDEs, Admins, Super Admins, and Team Leads can access the BDE portal
BDEActor = Depends(
    require_roles(
        UserRole.SALES,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.TEAM_LEAD,
    )
)


def sa_scope(actor):
    if actor.role == UserRole.SUPER_ADMIN:
        return True
    if not actor.agency_id:
        raise HTTPException(status_code=403, detail="Agency membership required")
    return Lead.agency_id == actor.agency_id


class CreateLeadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company_name: str = Field(..., min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    requirements: str | None = None
    estimated_deal_value: int = Field(default=0, ge=0)
    lead_source: str = "Inbound Website"
    priority: str = Field(default="warm", pattern="^(?i)(hot|warm|cold)$")
    status: str = Field(
        default="new",
        pattern="^(?i)(new|contacted|meeting_scheduled|proposal_sent|negotiation|converted|lost)$",
    )
    assigned_bde_id: uuid.UUID | None = None
    next_follow_up_at: datetime | None = None


class UpdateLeadRequest(BaseModel):
    name: str | None = None
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    requirements: str | None = None
    estimated_deal_value: int | None = Field(default=None, ge=0)
    lead_source: str | None = None
    priority: str | None = Field(default=None, pattern="^(?i)(hot|warm|cold)$")
    status: str | None = Field(
        default=None,
        pattern="^(?i)(new|contacted|meeting_scheduled|proposal_sent|negotiation|converted|lost)$",
    )
    lost_reason: str | None = None
    assigned_bde_id: uuid.UUID | None = None
    next_follow_up_at: datetime | None = None


class CreateLeadActivityRequest(BaseModel):
    activity_type: str = Field(default="call", pattern="^(?i)(call|whatsapp|email|meeting|note|proposal|status_change)$")
    summary: str = Field(..., min_length=1)
    outcome: str | None = None
    scheduled_follow_up: datetime | None = None


@router.get("/leads")
async def list_leads(
    priority: str | None = Query(default=None),
    lead_status: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    follow_up_filter: str | None = Query(default=None),  # "today", "overdue", "upcoming"
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> list[dict[str, Any]]:
    """List and filter leads with activity summary."""
    stmt = (
        select(Lead, User.full_name.label("bde_name"), User.email.label("bde_email"))
        .outerjoin(User, Lead.assigned_bde_id == User.id)
        .order_by(
            desc(Lead.priority == "hot"),
            desc(Lead.priority == "warm"),
            desc(Lead.created_at),
        )
    )

    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        stmt = stmt.where(Lead.agency_id == actor.agency_id)

    if assigned_to_me:
        stmt = stmt.where(Lead.assigned_bde_id == actor.user_id)

    if priority:
        stmt = stmt.where(Lead.priority == priority.lower())

    if lead_status:
        stmt = stmt.where(Lead.status == lead_status.lower())

    if search:
        s = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Lead.name).like(s),
                func.lower(Lead.company_name).like(s),
                func.lower(Lead.email).like(s),
                func.lower(Lead.phone).like(s),
            )
        )

    now = datetime.now(UTC)
    if follow_up_filter == "overdue":
        stmt = stmt.where(Lead.next_follow_up_at < now, Lead.status != "converted", Lead.status != "lost")
    elif follow_up_filter == "today":
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        stmt = stmt.where(Lead.next_follow_up_at >= start_of_day, Lead.next_follow_up_at < end_of_day)
    elif follow_up_filter == "upcoming":
        stmt = stmt.where(Lead.next_follow_up_at >= now)

    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for lead, bde_name, bde_email in rows:
        items.append({
            "id": str(lead.id),
            "name": lead.name,
            "company_name": lead.company_name,
            "email": lead.email,
            "phone": lead.phone,
            "requirements": lead.requirements,
            "estimated_deal_value": lead.estimated_deal_value,
            "lead_source": lead.lead_source,
            "priority": lead.priority.upper(),
            "status": lead.status.lower(),
            "lost_reason": lead.lost_reason,
            "next_follow_up_at": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
            "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
            "assigned_bde_id": str(lead.assigned_bde_id) if lead.assigned_bde_id else None,
            "assigned_bde_name": bde_name or ("Unassigned" if not lead.assigned_bde_id else "BDE Specialist"),
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
            "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
        })
    return items


@router.post("/leads", status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: CreateLeadRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Create a new prospective client lead."""
    # Safely verify assigned BDE user existence
    assigned_bde = None
    target_bde = payload.assigned_bde_id or actor.user_id
    if target_bde:
        exists_user = (await db.execute(select(User.id).where(User.id == target_bde))).scalar_one_or_none()
        if exists_user:
            assigned_bde = exists_user

    lead = Lead(
        agency_id=actor.agency_id,
        assigned_bde_id=assigned_bde,
        name=payload.name.strip(),
        company_name=payload.company_name.strip(),
        email=payload.email.strip().lower() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        requirements=payload.requirements.strip() if payload.requirements else None,
        estimated_deal_value=payload.estimated_deal_value,
        lead_source=payload.lead_source.strip(),
        priority=payload.priority.lower(),
        status=payload.status.lower(),
        next_follow_up_at=payload.next_follow_up_at,
        last_contacted_at=datetime.now(UTC) if payload.status != "new" else None,
    )
    db.add(lead)
    await db.flush()

    # Create initial activity
    init_activity = LeadActivity(
        lead_id=lead.id,
        bde_id=assigned_bde,
        activity_type="note",
        summary=f"Lead onboarded from {lead.lead_source} with {lead.priority.upper()} priority.",
        outcome="Lead created",
        scheduled_follow_up=payload.next_follow_up_at,
    )
    db.add(init_activity)

    if payload.next_follow_up_at and assigned_bde:
        notif = Notification(
            user_id=assigned_bde,
            title="📞 BDE Follow-Up Scheduled",
            message=f"Follow-up scheduled with {lead.name} ({lead.company_name}) for {payload.next_follow_up_at.strftime('%b %d, %Y')}.",
            type="bde_reminder",
            link="/bde",
        )
        db.add(notif)

    await db.commit()
    return {
        "status": "success",
        "message": f"Lead {lead.name} ({lead.company_name}) created successfully.",
        "lead_id": str(lead.id),
    }


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Retrieve full lead details and interaction timeline."""
    stmt = (
        select(Lead, User.full_name.label("bde_name"))
        .outerjoin(User, Lead.assigned_bde_id == User.id)
        .where(Lead.id == lead_id, sa_scope(actor))
        .options(selectinload(Lead.activities))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found.")

    lead, bde_name = row
    activities = sorted(lead.activities or [], key=lambda a: a.created_at, reverse=True)

    return {
        "id": str(lead.id),
        "name": lead.name,
        "company_name": lead.company_name,
        "email": lead.email,
        "phone": lead.phone,
        "requirements": lead.requirements,
        "estimated_deal_value": lead.estimated_deal_value,
        "lead_source": lead.lead_source,
        "priority": lead.priority.upper(),
        "status": lead.status.lower(),
        "lost_reason": lead.lost_reason,
        "next_follow_up_at": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
        "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
        "assigned_bde_id": str(lead.assigned_bde_id) if lead.assigned_bde_id else None,
        "assigned_bde_name": bde_name or "Unassigned",
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "activities": [
            {
                "id": str(act.id),
                "activity_type": act.activity_type,
                "summary": act.summary,
                "outcome": act.outcome,
                "scheduled_follow_up": act.scheduled_follow_up.isoformat() if act.scheduled_follow_up else None,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            }
            for act in activities
        ],
    }


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: uuid.UUID,
    payload: UpdateLeadRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Update lead parameters, stage, priority, or next scheduled follow-up."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id, sa_scope(actor)))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    old_status = lead.status
    if payload.name is not None:
        lead.name = payload.name.strip()
    if payload.company_name is not None:
        lead.company_name = payload.company_name.strip()
    if payload.email is not None:
        lead.email = payload.email.strip().lower() if payload.email else None
    if payload.phone is not None:
        lead.phone = payload.phone.strip() if payload.phone else None
    if payload.requirements is not None:
        lead.requirements = payload.requirements.strip() if payload.requirements else None
    if payload.estimated_deal_value is not None:
        lead.estimated_deal_value = payload.estimated_deal_value
    if payload.lead_source is not None:
        lead.lead_source = payload.lead_source.strip()
    if payload.priority is not None:
        lead.priority = payload.priority.lower()
    if payload.status is not None:
        lead.status = payload.status.lower()
    if payload.lost_reason is not None:
        lead.lost_reason = payload.lost_reason
    if payload.assigned_bde_id is not None:
        lead.assigned_bde_id = payload.assigned_bde_id
    if payload.next_follow_up_at is not None:
        lead.next_follow_up_at = payload.next_follow_up_at

    # If status changed, record activity
    if payload.status and payload.status.lower() != old_status:
        activity = LeadActivity(
            lead_id=lead.id,
            bde_id=actor.user_id,
            activity_type="status_change",
            summary=f"Stage updated from {old_status.upper()} to {payload.status.upper()}.",
            outcome=f"Stage changed: {payload.status.upper()}",
        )
        db.add(activity)

    await db.commit()
    return {
        "status": "success",
        "message": f"Lead {lead.company_name} updated successfully.",
        "lead_id": str(lead.id),
        "priority": lead.priority.upper(),
        "lead_status": lead.status,
    }


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, str]:
    """Delete or remove a lead."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id, sa_scope(actor)))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    await db.delete(lead)
    await db.commit()
    return {"status": "success", "message": "Lead removed successfully."}


@router.post("/leads/{lead_id}/activities")
async def add_lead_activity(
    lead_id: uuid.UUID,
    payload: CreateLeadActivityRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Log communication (Call, WhatsApp, Meeting, Proposal) and schedule follow-ups."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id, sa_scope(actor)))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    now = datetime.now(UTC)
    lead.last_contacted_at = now

    actor_user_id = None
    if actor.user_id:
        exists_user = (await db.execute(select(User.id).where(User.id == actor.user_id))).scalar_one_or_none()
        if exists_user:
            actor_user_id = exists_user

    notif_target = lead.assigned_bde_id or actor_user_id
    if payload.scheduled_follow_up and notif_target:
        notif = Notification(
            user_id=notif_target,
            title="⏰ Follow-Up Reminder",
            message=f"Follow-up due with {lead.name} ({lead.company_name}): {payload.summary[:80]}",
            type="bde_reminder",
            link="/bde",
        )
        db.add(notif)

    activity = LeadActivity(
        lead_id=lead.id,
        bde_id=actor_user_id,
        activity_type=payload.activity_type.lower(),
        summary=payload.summary.strip(),
        outcome=payload.outcome.strip() if payload.outcome else None,
        scheduled_follow_up=payload.scheduled_follow_up,
    )
    db.add(activity)
    await db.commit()

    return {
        "status": "success",
        "message": "Activity recorded successfully.",
        "activity_id": str(activity.id),
        "next_follow_up_at": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
    }


@router.get("/metrics")
async def get_bde_metrics(
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Calculate conversion rates, pipeline value, follow-up adherence, and stage breakdown."""
    base_query = select(Lead)
    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        base_query = base_query.where(Lead.agency_id == actor.agency_id)

    leads = (await db.execute(base_query)).scalars().all()

    total_leads = len(leads)
    hot_count = sum(1 for l in leads if l.priority == "hot")
    warm_count = sum(1 for l in leads if l.priority == "warm")
    cold_count = sum(1 for l in leads if l.priority == "cold")

    converted_leads = [l for l in leads if l.status == "converted"]
    converted_count = len(converted_leads)
    conversion_rate = round((converted_count / max(1, total_leads)) * 100, 1)

    total_pipeline_value = sum(l.estimated_deal_value for l in leads if l.status not in ("lost", "converted"))
    closed_revenue = sum(l.estimated_deal_value for l in converted_leads)

    now = datetime.now(UTC)
    overdue_follow_ups = sum(
        1 for l in leads if l.next_follow_up_at and l.next_follow_up_at < now and l.status not in ("converted", "lost")
    )
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_follow_ups = sum(
        1 for l in leads if l.next_follow_up_at and today_start <= l.next_follow_up_at < today_end
    )

    stage_counts = {
        "new": sum(1 for l in leads if l.status == "new"),
        "contacted": sum(1 for l in leads if l.status == "contacted"),
        "meeting_scheduled": sum(1 for l in leads if l.status == "meeting_scheduled"),
        "proposal_sent": sum(1 for l in leads if l.status == "proposal_sent"),
        "negotiation": sum(1 for l in leads if l.status == "negotiation"),
        "converted": converted_count,
        "lost": sum(1 for l in leads if l.status == "lost"),
    }

    return {
        "total_leads": total_leads,
        "conversion_rate": conversion_rate,
        "total_pipeline_value": total_pipeline_value,
        "closed_revenue": closed_revenue,
        "hot_count": hot_count,
        "warm_count": warm_count,
        "cold_count": cold_count,
        "overdue_follow_ups": overdue_follow_ups,
        "today_follow_ups": today_follow_ups,
        "stages": stage_counts,
    }


@router.get("/calendar")
async def get_bde_calendar(
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """List upcoming calls, meetings, and follow-ups with prospect information."""
    stmt = (
        select(Lead, User.full_name.label("bde_name"))
        .outerjoin(User, Lead.assigned_bde_id == User.id)
        .where(Lead.next_follow_up_at.isnot(None), Lead.status != "converted", Lead.status != "lost")
        .order_by(Lead.next_follow_up_at.asc())
    )
    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        stmt = stmt.where(Lead.agency_id == actor.agency_id)

    res = await db.execute(stmt)
    rows = res.all()

    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    overdue = []
    today = []
    upcoming = []

    for lead, bde_name in rows:
        item = {
            "id": str(lead.id),
            "lead_id": str(lead.id),
            "title": f"Follow-up with {lead.name}",
            "scheduled_time": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
            "is_overdue": lead.next_follow_up_at < now,
            "is_today": today_start <= lead.next_follow_up_at < today_end,
            "status_category": "overdue" if lead.next_follow_up_at < now else "today" if today_start <= lead.next_follow_up_at < today_end else "upcoming",
            "lead": {
                "id": str(lead.id),
                "name": lead.name,
                "company": lead.company_name,
                "phone": lead.phone,
                "priority": lead.priority,
                "status": lead.status,
            },
            "bde": {
                "name": bde_name or "BDE Specialist",
            },
        }
        if item["is_overdue"]:
            overdue.append(item)
        elif item["is_today"]:
            today.append(item)
        else:
            upcoming.append(item)

    return {
        "overdue": overdue,
        "today": today,
        "upcoming": upcoming,
        "total_scheduled": len(rows),
    }


@router.get("/performance")
async def get_bde_performance(
    db: AsyncSession = Depends(get_db),
    actor: Actor = BDEActor,
) -> dict[str, Any]:
    """Admin & Executive oversight on BDE work process: outreach velocity, clients reached, and rep leaderboard."""
    # 1. Base query for leads with activities and assigned BDE
    lead_query = (
        select(Lead, User.full_name.label("bde_name"), User.email.label("bde_email"))
        .outerjoin(User, Lead.assigned_bde_id == User.id)
        .options(selectinload(Lead.activities))
        .order_by(desc(Lead.updated_at))
    )
    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        lead_query = lead_query.where(Lead.agency_id == actor.agency_id)

    res = await db.execute(lead_query)
    lead_rows = res.all()

    # 2. Query all activities with lead details for recent outreach stream
    act_query = (
        select(LeadActivity, Lead.name.label("lead_name"), Lead.company_name, User.full_name.label("bde_name"))
        .join(Lead, LeadActivity.lead_id == Lead.id)
        .outerjoin(User, LeadActivity.bde_id == User.id)
        .order_by(desc(LeadActivity.created_at))
        .limit(40)
    )
    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        act_query = act_query.where(Lead.agency_id == actor.agency_id)

    act_res = await db.execute(act_query)
    act_rows = act_res.all()

    # 3. Query all BDE users
    bde_users_stmt = (
        select(User)
        .where(User.role.in_([UserRole.SALES, "bde", "sales"]))
        .where(User.account_status == "active")
    )
    if actor.role != UserRole.SUPER_ADMIN:
        sa_scope(actor)
        bde_users_stmt = bde_users_stmt.where(User.agency_id == actor.agency_id)
    bde_users = (await db.execute(bde_users_stmt)).scalars().all()

    # Calculate overall metrics
    total_leads = len(lead_rows)
    clients_reached_leads = [
        lead for lead, _, _ in lead_rows
        if lead.status != "new" or lead.last_contacted_at is not None or (lead.activities and len(lead.activities) > 0)
    ]
    total_clients_reached = len(clients_reached_leads)

    converted_leads = [lead for lead, _, _ in lead_rows if lead.status == "converted"]
    converted_count = len(converted_leads)
    conversion_rate = round((converted_count / max(1, total_leads)) * 100, 1)

    total_pipeline_value = sum(lead.estimated_deal_value for lead, _, _ in lead_rows if lead.status not in ("lost", "converted"))
    closed_revenue = sum(lead.estimated_deal_value for lead in converted_leads)

    # Activity breakdown across all leads
    all_activities = [act for lead, _, _ in lead_rows for act in (lead.activities or [])]
    activity_counts = {
        "call": sum(1 for a in all_activities if a.activity_type.lower() == "call"),
        "whatsapp": sum(1 for a in all_activities if a.activity_type.lower() == "whatsapp"),
        "email": sum(1 for a in all_activities if a.activity_type.lower() == "email"),
        "meeting": sum(1 for a in all_activities if a.activity_type.lower() == "meeting"),
        "proposal": sum(1 for a in all_activities if a.activity_type.lower() == "proposal"),
        "status_change": sum(1 for a in all_activities if a.activity_type.lower() == "status_change"),
        "note": sum(1 for a in all_activities if a.activity_type.lower() == "note"),
    }

    # BDE Rep Leaderboard
    rep_map: dict[str, dict[str, Any]] = {}
    for u in bde_users:
        uid_str = str(u.id)
        rep_map[uid_str] = {
            "bde_id": uid_str,
            "name": u.full_name or u.email,
            "email": u.email,
            "avatar_initials": "".join([part[0] for part in (u.full_name or u.email).split()[:2]]).upper(),
            "total_assigned": 0,
            "clients_reached": 0,
            "calls_count": 0,
            "whatsapp_count": 0,
            "emails_count": 0,
            "meetings_count": 0,
            "proposals_sent": 0,
            "deals_won": 0,
            "revenue_generated": 0,
            "last_active_at": None,
        }

    for lead, bde_name, bde_email in lead_rows:
        assigned_id = str(lead.assigned_bde_id) if lead.assigned_bde_id else None
        if assigned_id:
            if assigned_id not in rep_map:
                rep_map[assigned_id] = {
                    "bde_id": assigned_id,
                    "name": bde_name or bde_email or "BDE Rep",
                    "email": bde_email or "",
                    "avatar_initials": "".join([p[0] for p in (bde_name or "BD").split()[:2]]).upper(),
                    "total_assigned": 0,
                    "clients_reached": 0,
                    "calls_count": 0,
                    "whatsapp_count": 0,
                    "emails_count": 0,
                    "meetings_count": 0,
                    "proposals_sent": 0,
                    "deals_won": 0,
                    "revenue_generated": 0,
                    "last_active_at": None,
                }
            rep = rep_map[assigned_id]
            rep["total_assigned"] += 1
            is_reached = lead.status != "new" or lead.last_contacted_at is not None or bool(lead.activities)
            if is_reached:
                rep["clients_reached"] += 1
            if lead.status == "converted":
                rep["deals_won"] += 1
                rep["revenue_generated"] += lead.estimated_deal_value
            if lead.status == "proposal_sent":
                rep["proposals_sent"] += 1

            for act in (lead.activities or []):
                act_type = act.activity_type.lower()
                if act_type == "call":
                    rep["calls_count"] += 1
                elif act_type == "whatsapp":
                    rep["whatsapp_count"] += 1
                elif act_type == "email":
                    rep["emails_count"] += 1
                elif act_type == "meeting":
                    rep["meetings_count"] += 1
                elif act_type == "proposal":
                    rep["proposals_sent"] += 1

                act_time = act.created_at.isoformat() if act.created_at else None
                if act_time and (rep["last_active_at"] is None or act_time > rep["last_active_at"]):
                    rep["last_active_at"] = act_time

    # Compute conversion rates for reps
    bde_reps_list = list(rep_map.values())
    for r in bde_reps_list:
        r["conversion_rate"] = round((r["deals_won"] / max(1, r["total_assigned"])) * 100, 1)

    # Sort reps by clients_reached desc
    bde_reps_list.sort(key=lambda x: (x["clients_reached"], x["deals_won"], x["revenue_generated"]), reverse=True)

    # Format recent activities
    recent_activities_list = [
        {
            "id": str(act.id),
            "lead_id": str(act.lead_id),
            "lead_name": lead_name,
            "company_name": comp_name,
            "bde_name": bde_nm or "BDE Rep",
            "activity_type": act.activity_type,
            "summary": act.summary,
            "outcome": act.outcome,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        }
        for act, lead_name, comp_name, bde_nm in act_rows
    ]

    # Stage funnel with counts and values
    stages_order = ["new", "contacted", "meeting_scheduled", "proposal_sent", "negotiation", "converted", "lost"]
    stage_breakdown = []
    for stg in stages_order:
        matching = [l for l, _, _ in lead_rows if l.status == stg]
        stage_breakdown.append({
            "stage": stg,
            "count": len(matching),
            "value": sum(l.estimated_deal_value for l in matching),
        })

    # Lead summary rows for admin inspection
    leads_summary = [
        {
            "id": str(l.id),
            "name": l.name,
            "company_name": l.company_name,
            "email": l.email,
            "phone": l.phone,
            "priority": l.priority.upper(),
            "status": l.status,
            "estimated_deal_value": l.estimated_deal_value,
            "lead_source": l.lead_source,
            "assigned_bde_id": str(l.assigned_bde_id) if l.assigned_bde_id else None,
            "assigned_bde_name": bde_name or "Unassigned",
            "last_contacted_at": l.last_contacted_at.isoformat() if l.last_contacted_at else None,
            "next_follow_up_at": l.next_follow_up_at.isoformat() if l.next_follow_up_at else None,
            "activities_count": len(l.activities or []),
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l, bde_name, _ in lead_rows
    ]

    return {
        "overview": {
            "total_clients_reached": total_clients_reached,
            "total_leads": total_leads,
            "reach_rate": round((total_clients_reached / max(1, total_leads)) * 100, 1),
            "active_pipeline_value": total_pipeline_value,
            "closed_revenue": closed_revenue,
            "converted_count": converted_count,
            "conversion_rate": conversion_rate,
            "total_outreach_activities": len(all_activities),
            "activity_breakdown": activity_counts,
        },
        "bde_reps": bde_reps_list,
        "recent_activities": recent_activities_list,
        "stages": stage_breakdown,
        "leads": leads_summary,
    }

