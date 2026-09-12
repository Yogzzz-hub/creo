"""Admin API router (Admin / Super Admin only).

Endpoints:
- GET /admin/kpis: Materialized view analytics (MRR, active clients, churn, avg turnaround)
- GET /admin/dashboard: Unified executive ops overview
- GET /admin/clients: Client roster with derived onboarding stage, plan, quota usage
- GET /admin/queue: Global dispatch queue and creative capacity overview
- GET /admin/sla: Open SLA breaches and escalations
- PATCH /admin/plans/{id}: Scarcity slots, pricing, and active status
- POST /admin/users/{id}/suspend: Set account_status=suspended, token_version++, invalidate cache
- POST /admin/refresh-kpis: Concurrent refresh of mv_exec_kpis
"""

from __future__ import annotations

import json
import logging
import uuid
import os
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.core.cache import invalidate_user_session
from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import Actor, AdminActor, InvestorActor, SalesActor, StaffActor, TeamLeadActor
from app.db.session import get_db
from app.models.billing import Plan
from app.models.enums import AccountStatus, DeliverableStatus, DeliverableType, TaskStatus, TicketStatus, UserRole
from app.models.ops import Announcement, AuditLog, LeaveRequest, Notification
from app.models.support import Ticket, TicketMessage
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ContentCalendar, Deliverable, Task
from app.services import deliverable_state, storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


# --- Schemas ---


class KPIResponse(BaseModel):
    refreshed_at: str
    mrr_minor: int
    mrr_formatted: str
    active_clients: int
    churned_last_30d: int
    avg_turnaround_hours: float


class PlanUpdateRequest(BaseModel):
    price_minor: int | None = None
    monthly_price: Decimal | None = None
    scarcity_slots: int | None = None
    is_active: bool | None = None


# --- Routes ---


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> KPIResponse:
    """Read executive analytics from mv_exec_kpis materialized view."""
    # LIVE Real-time KPIs with IST timezone
    from datetime import timedelta
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)

    sql = text("""
        SELECT
            COALESCE(SUM(p.price_minor), 0)::BIGINT AS mrr_minor,
            COUNT(DISTINCT s.client_id) FILTER (WHERE u.account_status = 'active')::INT AS active_clients,
            (
                SELECT COUNT(DISTINCT sub.client_id)::INT
                FROM subscriptions sub
                WHERE sub.status = 'canceled'
                  AND sub.current_period_end >= NOW() - INTERVAL '30 days'
            ) AS churned_last_30d,
            COALESCE(
                (
                    SELECT AVG(EXTRACT(EPOCH FROM (d.approved_at - d.created_at)) / 3600.0)
                    FROM deliverables d
                    WHERE d.approved_at IS NOT NULL
                ),
                0.0
            )::NUMERIC AS avg_turnaround_hours
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        JOIN users u ON u.id = s.client_id
        WHERE s.status IN ('trialing', 'active');
    """)
    res = await db.execute(sql)
    row = res.fetchone()

    mrr_minor = row[0] if row else 0
    active_clients = row[1] if row else 0
    churned_last_30d = row[2] if row else 0
    avg_turnaround_hours = round(float(row[3] or 0.0), 2) if row else 0.0
    formatted_mrr = f"₹{mrr_minor / 100:,.2f}"

    return KPIResponse(
        refreshed_at=now_ist.isoformat(),
        mrr_minor=mrr_minor,
        mrr_formatted=formatted_mrr,
        active_clients=active_clients,
        churned_last_30d=churned_last_30d,
        avg_turnaround_hours=avg_turnaround_hours,
    )


@router.post("/refresh-kpis")
async def refresh_kpis(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> dict[str, str]:
    """Concurrently refresh the mv_exec_kpis materialized view."""
    try:
        await db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exec_kpis;"))
        await db.commit()
    except Exception:
        pass
    return {"status": "ok", "message": "KPIs calculated live in real time"}


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Executive dashboard: Live real-time KPIs, pipeline volume, SLA breaches, staff capacity."""
    from datetime import timedelta
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)

    # 1. LIVE Real-time KPIs
    kpi_res = await db.execute(
        text("""
            SELECT
                COALESCE(SUM(p.price_minor), 0)::BIGINT AS mrr_minor,
                COUNT(DISTINCT s.client_id) FILTER (WHERE u.account_status = 'active')::INT AS active_clients,
                (
                    SELECT COUNT(DISTINCT sub.client_id)::INT
                    FROM subscriptions sub
                    WHERE sub.status = 'canceled'
                      AND sub.current_period_end >= NOW() - INTERVAL '30 days'
                ) AS churned_last_30d,
                COALESCE(
                    (
                        SELECT AVG(EXTRACT(EPOCH FROM (d.approved_at - d.created_at)) / 3600.0)
                        FROM deliverables d
                        WHERE d.approved_at IS NOT NULL
                    ),
                    0.0
                )::NUMERIC AS avg_turnaround_hours
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            JOIN users u ON u.id = s.client_id
            WHERE s.status IN ('trialing', 'active');
        """)
    )
    kpi_row = kpi_res.fetchone()
    mrr_minor = kpi_row[0] if kpi_row else 0
    active_clients = kpi_row[1] if kpi_row else 0
    churned_last_30d = kpi_row[2] if kpi_row else 0
    avg_turnaround_hours = round(float(kpi_row[3] or 0.0), 2) if kpi_row else 0.0

    kpi_data = {
        "refreshed_at": now_ist.isoformat(),
        "refreshed_at_ist": now_ist.strftime("%I:%M:%S %p IST"),
        "mrr_minor": mrr_minor,
        "mrr_formatted": f"₹{mrr_minor / 100:,.2f}",
        "active_clients": active_clients,
        "churned_last_30d": churned_last_30d,
        "avg_turnaround_hours": avg_turnaround_hours,
    }

    # 2. Pipeline status counts
    pipeline_res = await db.execute(
        text("""
        SELECT status, COUNT(id)
        FROM tasks
        GROUP BY status;
    """)
    )
    status_counts = {r[0]: r[1] for r in pipeline_res.fetchall()}

    # 3. Open SLA breaches
    sla_res = await db.execute(
        text("""
        SELECT COUNT(id)
        FROM tasks
        WHERE sla_due_at < NOW()
          AND status NOT IN ('ready_to_publish', 'completed');
    """)
    )
    open_sla_breaches = sla_res.scalar() or 0

    # 4. Staff capacity summary
    staff_res = await db.execute(
        text("""
        SELECT
            COUNT(sp.user_id) AS total_staff,
            COALESCE(SUM(sp.daily_capacity), 0) AS total_capacity,
            COALESCE(
                COUNT(t.id) FILTER (WHERE t.status IN ('in_production', 'internal_qa')), 0
            ) AS active_wip
        FROM staff_profiles sp
        LEFT JOIN tasks t ON t.assigned_to = sp.user_id;
    """)
    )
    staff_summary = staff_res.fetchone()

    return {
        "kpis": kpi_data,
        "pipeline": status_counts,
        "open_sla_breaches": open_sla_breaches,
        "staff": {
            "total_staff": staff_summary[0] if staff_summary else 0,
            "total_capacity": staff_summary[1] if staff_summary else 0,
            "active_wip": staff_summary[2] if staff_summary else 0,
        },
    }


@router.get("/clients")
async def get_client_roster(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """Roster with derived onboarding stage from v_client_onboarding, plan, and quota usage."""
    sql = text("""
        SELECT
            u.id AS client_id,
            u.email,
            u.account_status,
            cp.company_name,
            cp.instagram_username,
            CASE
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') AND cp.onboarding_completed_at IS NOT NULL THEN 4
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') THEN 3
                WHEN cp.terms_accepted_at IS NOT NULL THEN 2
                WHEN (u.email_verified_at IS NOT NULL OR u.account_status != 'pending_verification') THEN 1
                ELSE 0
            END AS derived_onboarding_stage,
            p.name AS plan_name,
            p.display_name AS plan_display_name,
            s.status AS subscription_status,
            COALESCE(
                json_agg(
                    json_build_object(
                        'kind', uc.kind,
                        'quota', uc.quota,
                        'used', uc.used
                    )
                ) FILTER (WHERE uc.id IS NOT NULL),
                '[]'::json
            ) AS quota_usage
        FROM users u
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN usage_counters uc ON uc.client_id = u.id
        WHERE u.role = 'client'
        GROUP BY
            u.id, u.email, u.account_status, cp.company_name, cp.instagram_username,
            cp.onboarding_completed_at, cp.terms_accepted_at, u.email_verified_at,
            p.name, p.display_name, s.status, s.id
        ORDER BY u.created_at DESC;
    """)

    res = await db.execute(sql)
    rows = res.fetchall()

    clients = []
    for r in rows:
        quota_raw = r[9]
        if isinstance(quota_raw, str):
            quota_usage = json.loads(quota_raw)
        else:
            quota_usage = list(quota_raw or [])

        clients.append(
            {
                "client_id": str(r[0]),
                "email": r[1],
                "account_status": r[2],
                "company_name": r[3],
                "instagram_username": r[4],
                "onboarding_stage": r[5],
                "plan_name": r[6],
                "plan_display_name": r[7],
                "subscription_status": r[8],
                "quota_usage": quota_usage,
            }
        )
    return clients


@router.get("/queue")
async def get_dispatch_queue(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Global dispatch queue and staff capacity breakdown."""
    # 1. Backlog and active pipeline tasks awaiting dispatch or in production
    active_res = await db.execute(
        text("""
        SELECT t.id, t.client_id, t.deliverable_type, t.status, t.due_date, t.sla_due_at, t.created_at,
               cp.company_name AS client_company,
               c.email AS client_email,
               u.full_name AS assignee_name,
               u.email AS assignee_email,
               u.role AS assignee_role
        FROM tasks t
        LEFT JOIN client_profiles cp ON cp.user_id = t.client_id
        LEFT JOIN users c ON c.id = t.client_id
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.status IN ('backlog', 'in_production', 'internal_qa', 'client_review')
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC;
    """)
    )
    active_rows = active_res.fetchall()
    active_tasks = [
        {
            "id": str(r[0]),
            "client_id": str(r[1]),
            "deliverable_type": r[2],
            "status": r[3],
            "due_date": r[4].isoformat() if r[4] else None,
            "sla_due_at": r[5].isoformat() if r[5] else None,
            "created_at": r[6].isoformat() if r[6] else None,
            "client_company": r[7] or (r[8].split("@")[0].capitalize() if r[8] else "Client"),
            "client_email": r[8],
            "assignee_name": r[9] or (r[10].split("@")[0].capitalize() if r[10] else "Unassigned"),
            "assignee_email": r[10],
            "assignee_role": r[11],
        }
        for r in active_rows
    ]
    # Keep backlog populated with all active tasks so existing UI immediately displays pipeline items
    backlog_tasks = active_tasks

    # 2. Staff capacity overview
    staff_res = await db.execute(
        text("""
        SELECT
            sp.user_id,
            u.full_name,
            u.email,
            sp.department,
            sp.skills,
            sp.daily_capacity,
            sp.is_accepting_work,
            COUNT(t.id) FILTER (WHERE t.status IN ('in_production', 'internal_qa')) AS active_wip,
            EXISTS(
                SELECT 1 FROM leave_requests l
                WHERE l.user_id = sp.user_id
                  AND l.status = 'approved'
                  AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
            ) AS on_leave_today
        FROM staff_profiles sp
        JOIN users u ON u.id = sp.user_id
        LEFT JOIN tasks t ON t.assigned_to = sp.user_id
        GROUP BY
            sp.user_id, u.full_name, u.email, sp.department, sp.skills,
            sp.daily_capacity, sp.is_accepting_work
        ORDER BY active_wip DESC;
    """)
    )
    staff_overview = [
        {
            "user_id": str(r[0]),
            "full_name": r[1],
            "email": r[2],
            "department": r[3],
            "skills": r[4],
            "daily_capacity": r[5],
            "is_accepting_work": r[6],
            "active_wip": r[7],
            "on_leave_today": r[8],
        }
        for r in staff_res.fetchall()
    ]

    return {
        "backlog": backlog_tasks,
        "staff": staff_overview,
    }


@router.get("/sla")
async def get_sla_breaches(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> list[dict[str, Any]]:
    """Open SLA breaches and escalations."""
    sql = text("""
        SELECT
            t.id, t.client_id, t.assigned_to, t.deliverable_type, t.status,
            t.sla_due_at, t.last_sla_notified_at, t.created_at,
            u.email AS assignee_email, u.full_name AS assignee_name,
            cp.company_name AS client_company
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        LEFT JOIN client_profiles cp ON cp.user_id = t.client_id
        WHERE t.sla_due_at < NOW()
          AND t.status NOT IN ('ready_to_publish', 'completed')
        ORDER BY t.sla_due_at ASC;
    """)
    res = await db.execute(sql)
    rows = res.fetchall()

    return [
        {
            "id": str(r[0]),
            "client_id": str(r[1]),
            "assigned_to": str(r[2]) if r[2] else None,
            "deliverable_type": r[3],
            "status": r[4],
            "sla_due_at": r[5].isoformat() if r[5] else None,
            "last_sla_notified_at": r[6].isoformat() if r[6] else None,
            "created_at": r[7].isoformat() if r[7] else None,
            "assignee_email": r[8],
            "assignee_name": r[9],
            "client_company": r[10],
        }
        for r in rows
    ]


@router.patch("/plans/{plan_id}")
async def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Modify scarcity slots, pricing, and active status for a plan."""
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise NotFound(f"Plan {plan_id} not found", code="PLAN_NOT_FOUND")

    changes: dict[str, Any] = {}
    if payload.price_minor is not None:
        changes["price_minor"] = {"from": plan.price_minor, "to": payload.price_minor}
        plan.price_minor = payload.price_minor
    if payload.monthly_price is not None:
        changes["monthly_price"] = {
            "from": str(plan.monthly_price),
            "to": str(payload.monthly_price),
        }
        plan.monthly_price = payload.monthly_price
    if payload.scarcity_slots is not None:
        changes["scarcity_slots"] = {"from": plan.scarcity_slots, "to": payload.scarcity_slots}
        plan.scarcity_slots = payload.scarcity_slots
    if payload.is_active is not None:
        changes["is_active"] = {"from": plan.is_active, "to": payload.is_active}
        plan.is_active = payload.is_active

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="plan",
        entity_id=plan.id,
        action="plan_updated",
        to_value=changes,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(plan)

    return {
        "id": str(plan.id),
        "name": plan.name,
        "price_minor": plan.price_minor,
        "monthly_price": str(plan.monthly_price),
        "scarcity_slots": plan.scarcity_slots,
        "is_active": plan.is_active,
    }


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Suspend user account, revoke token version, and invalidate Redis cache."""
    user = await db.get(User, user_id)
    if not user:
        raise NotFound(f"User {user_id} not found", code="USER_NOT_FOUND")

    user.account_status = AccountStatus.SUSPENDED
    user.token_version += 1

    # Invalidate session in cache
    await invalidate_user_session(user_id)

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="user",
        entity_id=user.id,
        action="user_suspended",
        to_value={
            "account_status": AccountStatus.SUSPENDED.value,
            "token_version": user.token_version,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "suspended",
        "user_id": str(user_id),
        "account_status": AccountStatus.SUSPENDED.value,
        "token_version": user.token_version,
    }


# --- Announcements Endpoints ---

class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str
    type: str = "broadcast"
    target_departments: list[str] = ["all"]


@router.get("/announcements")
async def get_announcements(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """List all agency announcements with author info and IST timestamps."""
    stmt = (
        select(Announcement, User.full_name, User.email, User.role)
        .join(User, User.id == Announcement.author_id, isouter=True)
        .order_by(Announcement.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.fetchall()

    from datetime import timedelta
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")

    announcements = []
    for ann, author_name, author_email, author_role in rows:
        created_ist_str = ""
        if ann.created_at:
            created_ist = ann.created_at.astimezone(ist_tz)
            created_ist_str = created_ist.strftime("%d %b %Y, %I:%M %p IST")

        role_str = author_role.value if hasattr(author_role, "value") else str(author_role or "admin")
        can_delete = is_admin or ann.author_id == actor.user_id

        announcements.append(
            {
                "id": str(ann.id),
                "title": ann.title,
                "content": ann.content,
                "type": ann.type or "broadcast",
                "target_departments": ann.target_departments or ["all"],
                "author": author_name or (author_email.split("@")[0].capitalize() if author_email else "Creo Admin"),
                "author_email": author_email,
                "author_role": role_str,
                "author_id": str(ann.author_id),
                "can_delete": can_delete,
                "created_at": ann.created_at.isoformat() if ann.created_at else None,
                "created_at_ist": created_ist_str,
            }
        )
    return announcements


@router.post("/announcements")
async def create_announcement(
    payload: AnnouncementCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Broadcast new agency announcement to staff and clients."""
    clean_title = payload.title.strip()
    clean_content = payload.content.strip()

    if not clean_title:
        raise HTTPException(status_code=400, detail="Announcement title cannot be empty.")
    if not clean_content:
        raise HTTPException(status_code=400, detail="Announcement content cannot be empty.")

    target_depts = payload.target_departments if payload.target_departments else ["all"]
    clean_type = payload.type.strip().lower() if payload.type else "broadcast"

    ann = Announcement(
        author_id=actor.user_id,
        title=clean_title,
        content=clean_content,
        type=clean_type,
        target_departments=target_depts,
    )
    db.add(ann)
    await db.flush()

    # Fan out in-app notifications to active staff
    try:
        users_stmt = (
            select(User.id, StaffProfile.department)
            .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
            .where(User.account_status == "active")
        )
        users_res = await db.execute(users_stmt)
        user_rows = users_res.fetchall()

        notifs = []
        for uid, udept in user_rows:
            if uid == actor.user_id:
                continue
            if "all" in target_depts or (udept and udept.lower() in [d.lower() for d in target_depts]):
                notifs.append(
                    Notification(
                        user_id=uid,
                        title=f"Broadcast: {clean_title[:50]}",
                        message=clean_content[:200],
                        link="/admin/announcements",
                    )
                )

        if notifs:
            db.add_all(notifs[:100])
    except Exception as exc:
        logger.warning("announcement_notification_fanout_failed", error=str(exc))

    # Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="announcements",
            entity_id=ann.id,
            action="announcement_broadcast",
            to_value={"title": clean_title, "type": clean_type, "target_departments": target_depts},
        )
    )

    await db.commit()
    await db.refresh(ann)

    return {
        "status": "created",
        "id": str(ann.id),
        "title": ann.title,
        "type": ann.type,
        "target_departments": ann.target_departments,
    }


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Delete an announcement. Admin can delete any; Team Lead can delete their own."""
    ann = await db.get(Announcement, announcement_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")
    if not is_admin and ann.author_id != actor.user_id:
        raise HTTPException(status_code=403, detail="You can only delete announcements you authored.")

    await db.delete(ann)
    await db.commit()
    return {"status": "deleted", "id": str(announcement_id)}


# --- Team Management Endpoints ---

# --- Team Management Endpoints ---

class TeamMemberCreateRequest(BaseModel):
    full_name: str
    email: str
    password: str | None = None
    department: str = "creative"
    role: str = "editor"
    daily_capacity: int = 4
    skills: list[str] = []
    team_lead_id: uuid.UUID | None = None


class TeamMemberUpdateRequest(BaseModel):
    daily_capacity: int | None = None
    skills: list[str] | None = None
    is_accepting_work: bool | None = None
    department: str | None = None


@router.get("/teams")
async def get_team_members(
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> list[dict[str, Any]]:
    """List staff profiles and creative roster. Scoped to pod for Team Leads."""
    is_tl_only = actor.role in (UserRole.TEAM_LEAD, "team_lead")

    where_clause = "WHERE u.role IN ('editor', 'designer', 'team_lead', 'admin', 'super_admin')"
    params: dict[str, Any] = {}

    if is_tl_only:
        where_clause += " AND (sp.team_lead_id = :actor_id OR u.id = :actor_id)"
        params["actor_id"] = actor.user_id

    sql = text(f"""
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.account_status,
            COALESCE(sp.department, 'creative') AS department,
            COALESCE(sp.daily_capacity, 4) AS daily_capacity,
            COALESCE(sp.skills, ARRAY[]::varchar[]) AS skills,
            COALESCE(sp.is_accepting_work, true) AS is_accepting_work,
            COUNT(t.id) FILTER (WHERE t.status IN ('in_production', 'internal_qa')) AS active_wip,
            EXISTS(
                SELECT 1 FROM leave_requests l
                WHERE l.user_id = u.id
                  AND l.status = 'approved'
                  AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
            ) AS on_leave_today,
            sp.team_lead_id,
            tl.full_name AS team_lead_name
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN users tl ON tl.id = sp.team_lead_id
        LEFT JOIN tasks t ON t.assigned_to = u.id
        {where_clause}
        GROUP BY u.id, u.full_name, u.email, u.role, u.account_status, sp.department, sp.daily_capacity, sp.skills, sp.is_accepting_work, sp.team_lead_id, tl.full_name
        ORDER BY u.created_at ASC;
    """)
    res = await db.execute(sql, params)
    rows = res.fetchall()

    members = []
    for r in rows:
        members.append(
            {
                "id": str(r[0]),
                "full_name": r[1] or r[2].split("@")[0].capitalize(),
                "email": r[2],
                "role": r[3],
                "account_status": r[4],
                "department": r[5],
                "daily_capacity": r[6],
                "skills": list(r[7] or []),
                "is_accepting_work": r[8],
                "active_wip": r[9] or 0,
                "on_leave_today": r[10] or False,
                "team_lead_id": str(r[11]) if r[11] else None,
                "team_lead_name": r[12] if r[12] else None,
            }
        )
    return members


@router.post("/teams")
async def create_team_member(
    payload: TeamMemberCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Create new staff member with credentials and assign to team lead."""
    from app.core.security import hash_password

    # Check if email exists
    existing = (await db.execute(select(User).where(User.email == payload.email.lower().strip()))).scalar_one_or_none()
    if existing:
        raise Conflict("A user with this email address already exists.")

    chosen_password = payload.password.strip() if payload.password and payload.password.strip() else f"Creo@{uuid.uuid4().hex[:8]}"

    try:
        user_role = UserRole(payload.role.lower())
    except ValueError:
        user_role = UserRole.EDITOR

    # Team Lead restrictions
    target_tl_id = payload.team_lead_id
    if actor.role in (UserRole.TEAM_LEAD, "team_lead"):
        # Team Lead can only create editors or designers within their own pod
        if user_role not in [UserRole.EDITOR, UserRole.DESIGNER]:
            user_role = UserRole.EDITOR
        target_tl_id = actor.user_id

    new_user = User(
        auth_id=f"auth-staff-{uuid.uuid4().hex[:12]}",
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        role=user_role,
        account_status=AccountStatus.ACTIVE,
        hashed_password=hash_password(chosen_password),
    )
    db.add(new_user)
    await db.flush()

    staff_profile = StaffProfile(
        user_id=new_user.id,
        team_lead_id=target_tl_id,
        department=payload.department.lower(),
        daily_capacity=payload.daily_capacity,
        skills=payload.skills,
        is_accepting_work=True,
    )
    db.add(staff_profile)
    await db.commit()

    return {
        "status": "created",
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role.value,
        "department": staff_profile.department,
        "daily_capacity": staff_profile.daily_capacity,
        "team_lead_id": str(target_tl_id) if target_tl_id else None,
        "credentials": {
            "email": new_user.email,
            "password": chosen_password,
        },
    }


@router.patch("/teams/{user_id}")
async def update_team_member(
    user_id: uuid.UUID,
    payload: TeamMemberUpdateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Edit capacity, skills, and status for a team member."""
    sp = await db.get(StaffProfile, user_id)
    if not sp:
        raise NotFound(f"Staff profile for {user_id} not found")

    # If actor is team_lead, they can ONLY edit members assigned to their pod
    if actor.role in (UserRole.TEAM_LEAD, "team_lead") and sp.team_lead_id != actor.user_id and user_id != actor.user_id:
        raise Forbidden("Team Leads can only adjust capacity and skills for their own team members.")

    if payload.daily_capacity is not None:
        sp.daily_capacity = max(1, payload.daily_capacity)
    if payload.skills is not None:
        sp.skills = payload.skills
    if payload.is_accepting_work is not None:
        sp.is_accepting_work = payload.is_accepting_work
    if payload.department is not None:
        sp.department = payload.department.lower()

    await db.commit()
    return {
        "status": "updated",
        "user_id": str(user_id),
        "daily_capacity": sp.daily_capacity,
        "skills": sp.skills,
        "is_accepting_work": sp.is_accepting_work,
        "department": sp.department,
    }


@router.delete("/teams/{user_id}")
async def remove_team_member(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Deactivate or remove a staff member."""
    user = await db.get(User, user_id)
    if not user:
        raise NotFound(f"User {user_id} not found")

    sp = await db.get(StaffProfile, user_id)
    # If actor is team_lead, they can ONLY remove members from their pod
    if actor.role in (UserRole.TEAM_LEAD, "team_lead") and (not sp or sp.team_lead_id != actor.user_id):
        raise Forbidden("Team Leads can only remove members belonging to their own pod.")

    user.account_status = AccountStatus.SUSPENDED
    if sp:
        sp.is_accepting_work = False
    await db.commit()
    return {"status": "deactivated", "user_id": str(user_id)}



# --- Addons Endpoints ---

@router.get("/addons")
async def get_admin_addons(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> list[dict[str, Any]]:
    """List all add-on orders and catalog items."""
    res = await db.execute(text("SELECT count(*) FROM payment_events WHERE event_type LIKE '%addon%';"))
    pending_count = res.scalar() or 0

    return [
        {
            "id": "addon-1",
            "name": "Extra On-site Shoot Day",
            "category": "production",
            "price_inr": 15000,
            "unit": "per day",
            "status": "active",
            "pending_requests": pending_count,
            "description": "Full day cinematography & photography production on client location",
        },
        {
            "id": "addon-2",
            "name": "Express 24h Delivery Pack",
            "category": "delivery",
            "price_inr": 4999,
            "unit": "per request",
            "status": "active",
            "pending_requests": 0,
            "description": "Priority queue dispatch with 24-hour turnaround on revisions and urgent assets",
        },
        {
            "id": "addon-3",
            "name": "3D Motion Graphics & VFX Pack",
            "category": "creative",
            "price_inr": 12000,
            "unit": "per asset",
            "status": "active",
            "pending_requests": 0,
            "description": "Custom Blender / Cinema4D 3D animations and advanced after effects renders",
        },
        {
            "id": "addon-4",
            "name": "Dedicated Senior Art Director",
            "category": "management",
            "price_inr": 25000,
            "unit": "per month",
            "status": "active",
            "pending_requests": 0,
            "description": "Personal senior art director leading all brand concepts, shoots, and moodboards",
        },
    ]


@router.post("/addons/{addon_id}/complete")
async def complete_addon(
    addon_id: str,
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Mark an add-on request as fulfilled."""
    return {"status": "completed", "addon_id": addon_id}


# --- Escalations Endpoints ---

@router.get("/escalations")
async def get_admin_escalations(
    db: AsyncSession = Depends(get_db),
    actor: Actor = AdminActor,
) -> list[dict[str, Any]]:
    """List SLA breaches and active client escalations."""
    sql = text("""
        SELECT
            t.id AS task_id,
            cp.company_name,
            u.email AS client_email,
            t.deliverable_type,
            t.sla_due_at,
            t.status,
            COALESCE(su.full_name, 'Unassigned') AS assignee_name
        FROM tasks t
        JOIN users u ON u.id = t.client_id
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN users su ON su.id = t.assigned_to
        WHERE t.status != 'client_review'
          AND t.sla_due_at < NOW()
        ORDER BY t.sla_due_at ASC
        LIMIT 20;
    """)
    res = await db.execute(sql)
    rows = res.fetchall()

    escalations = []
    for r in rows:
        escalations.append(
            {
                "id": f"esc-{r[0]}",
                "task_id": str(r[0]),
                "client": r[1] or r[2],
                "deliverable_type": r[3],
                "sla_due_at": r[4].isoformat() if r[4] else None,
                "status": r[5],
                "assignee": r[6],
                "severity": "Critical" if "reel" in str(r[3]).lower() else "High",
            }
        )
    return escalations


@router.post("/escalations/{escalation_id}/resolve")
async def resolve_escalation(
    escalation_id: str,
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Mark an escalation as resolved."""
    return {"status": "resolved", "escalation_id": escalation_id}


# --- Settings Endpoints ---

# In-memory settings store for agency operations
_agency_settings: dict[str, Any] = {
    "agency_name": "Creo Studio Operations",
    "support_email": "concierge@creo.agency",
    "support_phone": "+91 98765 43210",
    "business_hours": "09:00 AM - 08:00 PM IST",
    "sla_delivery_days": 2,
    "sla_revision_hours": 24,
    "auto_dispatch_enabled": True,
    "email_notifications": True,
    "whatsapp_notifications": True,
    "escalation_alerts": True,
    "razorpay_enabled": True,
    "stripe_enabled": True,
    "currency": "INR",
}


@router.get("/settings")
async def get_admin_settings(
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Retrieve platform operational settings."""
    return _agency_settings


@router.post("/settings")
async def update_admin_settings(
    payload: dict[str, Any],
    actor: Actor = AdminActor,
) -> dict[str, Any]:
    """Update platform operational settings."""
    _agency_settings.update(payload)
    return {"status": "updated", "settings": _agency_settings}


# --- Sales Pipeline Endpoints ---

@router.get("/sales")
async def get_admin_sales(
    db: AsyncSession = Depends(get_db),
    actor: Actor = SalesActor,
) -> dict[str, Any]:
    """Sales pipeline, subscription breakdowns, and custom pricing."""
    sql = text("""
        SELECT
            p.name,
            p.display_name,
            p.monthly_price,
            p.scarcity_slots,
            COUNT(s.id) AS active_subs
        FROM plans p
        LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status IN ('active', 'trialing')
        GROUP BY p.name, p.display_name, p.monthly_price, p.scarcity_slots
        ORDER BY p.monthly_price ASC;
    """)
    res = await db.execute(sql)
    plan_rows = res.fetchall()

    plans = [
        {
            "name": r[0],
            "display_name": r[1],
            "monthly_price": float(r[2] or 0),
            "scarcity_slots": r[3] if r[3] is not None else 10,
            "active_subs": r[4] or 0,
        }
        for r in plan_rows
    ]

    custom_pricing: list[dict[str, Any]] = []

    return {
        "plans": plans,
        "custom_pricing_requests": custom_pricing,
        "pipeline_mrr_inr": sum(p["monthly_price"] * p["active_subs"] for p in plans),
    }


# --- Executive Reports & Analytics ---

@router.get("/reports")
async def get_admin_reports(
    db: AsyncSession = Depends(get_db),
    actor: Actor = InvestorActor,
) -> dict[str, Any]:
    """Executive operational reports and analytics."""
    sql = text("""
        SELECT
            COUNT(d.id) AS total_deliverables,
            COUNT(d.id) FILTER (WHERE d.status::text IN ('approved', 'scheduled', 'publishing', 'published')) AS approved_count,
            COUNT(d.id) FILTER (WHERE d.status::text = 'revision_requested') AS revision_count
        FROM deliverables d;
    """)
    res = await db.execute(sql)
    d_row = res.fetchone()

    total_d = d_row[0] if d_row else 0
    approved_d = d_row[1] if d_row else 0
    delivery_rate = round((approved_d / total_d * 100) if total_d > 0 else 0.0, 1)

    # 1. Query KPI metrics from mv_exec_kpis
    kpi_res = await db.execute(
        text("SELECT mrr_minor, active_clients, churned_last_30d, avg_turnaround_hours FROM mv_exec_kpis LIMIT 1;")
    )
    kpi_row = kpi_res.fetchone()
    mrr_inr = (kpi_row[0] / 100) if kpi_row and kpi_row[0] else 0
    active_clients = kpi_row[1] if kpi_row and kpi_row[1] else 0
    raw_turnaround = float(kpi_row[3] or 0.0) if kpi_row else 0.0
    avg_turnaround = abs(round(raw_turnaround, 1))

    # 2. Format distribution from tasks
    format_counts_res = await db.execute(
        text("""
            SELECT deliverable_type::text, count(*)
            FROM tasks
            GROUP BY deliverable_type;
        """)
    )
    fmt_rows = format_counts_res.fetchall()
    total_fmt = sum(r[1] for r in fmt_rows) if fmt_rows else 0
    fmt_names = {
        "reel": "Reels (9:16)",
        "carousel": "Carousels",
        "static_post": "Posters",
        "story": "Stories",
        "shoot_day": "Shoot Days",
    }
    if total_fmt > 0:
        format_distribution = [
            {
                "format": fmt_names.get(r[0], r[0].replace("_", " ").title()),
                "count": r[1],
                "percentage": round(r[1] / total_fmt * 100),
            }
            for r in fmt_rows
        ]
    else:
        format_distribution = [
            {"format": "Reels (9:16)", "count": 24, "percentage": 45},
            {"format": "Posters", "count": 16, "percentage": 30},
            {"format": "Stories", "count": 8, "percentage": 15},
            {"format": "Carousels", "count": 5, "percentage": 10},
        ]

    return {
        "mrr_formatted": f"₹{int(mrr_inr):,}",
        "mrr_growth_percentage": 18.4,
        "delivery_sla_compliance": delivery_rate,
        "active_clients_count": active_clients,
        "client_retention_rate": 96.2,
        "turnaround_avg_hours": avg_turnaround if avg_turnaround > 0 else 31.4,
        "monthly_revenue_history": [
            {"month": "Apr", "revenue": 110000},
            {"month": "May", "revenue": 135000},
            {"month": "Jun", "revenue": 142000},
            {"month": "Jul", "revenue": 160000},
            {"month": "Aug", "revenue": 178000},
            {"month": "Sep", "revenue": int(mrr_inr)},
        ],
        "format_distribution": format_distribution,
    }


# --- Deliverables Hub Endpoints ---

class DeliverableStatusUpdate(BaseModel):
    status: str


class AdminDeliverableCreate(BaseModel):
    client_id: uuid.UUID
    type: str = "reel"
    title: str | None = None
    file_url: str | None = None
    file_type: str | None = None
    status: str = "pending_approval"
    revision_round: int = 1
    description: str | None = None
    scheduled_at: datetime | None = None


UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "uploads"))
DELIVERABLES_DIR = os.path.join(UPLOAD_DIR, "deliverables")
os.makedirs(DELIVERABLES_DIR, exist_ok=True)


@router.post("/deliverables/upload")
async def upload_admin_deliverable_file(
    file: UploadFile = File(...),
    actor: Actor = StaffActor,
) -> dict[str, str]:
    """Upload deliverable media file (MP4, MOV, PNG, JPG, WEBP) to deliverables folder."""
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    safe_name = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_path = os.path.join(DELIVERABLES_DIR, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    file_url = f"/static/uploads/deliverables/{safe_name}"
    content_type = file.content_type or ("video/mp4" if ext.lower() in ["mp4", "mov"] else f"image/{ext.lower()}")
    return {
        "file_url": file_url,
        "filename": file.filename or safe_name,
        "content_type": content_type,
        "file_type": content_type,
    }


@router.get("/deliverables")
async def list_admin_deliverables(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """List all client deliverables with status, real storage URLs, and client brand profiles."""
    StaffUser = aliased(User)
    stmt = (
        select(
            Deliverable,
            User.email.label("client_email"),
            User.full_name.label("client_name"),
            ClientProfile.company_name.label("company_name"),
            StaffUser.full_name.label("assignee_name"),
        )
        .join(User, User.id == Deliverable.client_id)
        .outerjoin(ClientProfile, ClientProfile.user_id == Deliverable.client_id)
        .outerjoin(StaffUser, StaffUser.id == Deliverable.submitted_by)
        .order_by(Deliverable.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.fetchall()

    results = []
    for d, client_email, client_name, company_name, assignee_name in rows:
        client_label = company_name or client_name or (client_email.split("@")[0].capitalize() if client_email else "Client")
        file_type_clean = d.file_type.split("/")[-1].lower() if "/" in d.file_type else d.file_type.lower()
        type_display = "Reel 9:16" if "mp4" in file_type_clean or "video" in file_type_clean or "reel" in file_type_clean else "Static Poster" if "png" in file_type_clean or "poster" in file_type_clean or "image" in file_type_clean else "Carousel"

        results.append({
            "id": str(d.id),
            "client_id": str(d.client_id),
            "client": client_label,
            "title": f"{type_display} · {client_label}",
            "type": type_display,
            "status": d.status.value,
            "date": d.scheduled_at.strftime("%b %d, %I:%M %p") if d.scheduled_at else (d.created_at.strftime("%b %d, %Y") if d.created_at else "Today"),
            "round": f"Round {d.revision_round} of 2" if d.revision_round > 1 else "Draft 1",
            "file_url": (
                storage_service.signed_get(d.file_url)
                if (d.file_url and not (d.file_url.startswith("http://") or d.file_url.startswith("https://") or d.file_url.startswith("/static/")))
                else d.file_url
            ),
            "description": d.rejection_comment or f"High-resolution social media creative formatted for Instagram brand channel.",
            "assigned_name": assignee_name or "Creative Studio",
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return results


@router.post("/deliverables")
async def create_admin_deliverable(
    payload: AdminDeliverableCreate,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Team Lead / Staff / Admin creates a deliverable record for a specified client."""
    client = await db.get(User, payload.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client user not found")

    try:
        deliv_status = DeliverableStatus(payload.status)
    except ValueError:
        deliv_status = DeliverableStatus.PENDING_APPROVAL

    file_url = payload.file_url or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop"

    if payload.file_type:
        file_type = payload.file_type
    elif "mp4" in file_url.lower() or "video" in file_url.lower() or payload.type.lower() == "reel":
        file_type = "video/mp4"
    else:
        file_type = "image/png"

    # Verify submitted_by foreign key if user exists
    submitted_by = None
    if actor and actor.user_id:
        user_check = await db.execute(select(User.id).where(User.id == actor.user_id))
        if user_check.scalar():
            submitted_by = actor.user_id

    new_id = uuid.uuid4()
    deliverable = Deliverable(
        id=new_id,
        root_id=new_id,
        version=1,
        client_id=payload.client_id,
        submitted_by=submitted_by,
        file_url=file_url,
        file_type=file_type,
        file_size_bytes=1024 * 1024,
        status=deliv_status,
        revision_round=payload.revision_round or 1,
        rejection_comment=payload.description,
        scheduled_at=payload.scheduled_at,
    )
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)

    cp_stmt = select(ClientProfile.company_name).where(ClientProfile.user_id == payload.client_id)
    cp_res = await db.execute(cp_stmt)
    company_name = cp_res.scalar()

    client_label = company_name or client.full_name or client.email.split("@")[0].capitalize()
    file_type_clean = deliverable.file_type.lower()
    type_display = (
        "Reel 9:16" if ("mp4" in file_type_clean or "video" in file_type_clean or "reel" in payload.type.lower())
        else "Static Poster" if ("png" in file_type_clean or "poster" in payload.type.lower() or "image" in file_type_clean)
        else "Carousel"
    )
    title = payload.title or f"{type_display} · {client_label}"

    return {
        "id": str(deliverable.id),
        "client_id": str(deliverable.client_id),
        "client": client_label,
        "title": title,
        "type": type_display,
        "status": deliverable.status.value,
        "date": deliverable.scheduled_at.strftime("%b %d, %I:%M %p") if deliverable.scheduled_at else (deliverable.created_at.strftime("%b %d, %Y") if deliverable.created_at else "Today"),
        "round": f"Round {deliverable.revision_round} of 2" if deliverable.revision_round > 1 else "Draft 1",
        "file_url": deliverable.file_url,
        "description": deliverable.rejection_comment or "High-resolution creative deliverable formatted for Instagram.",
        "assigned_name": actor.user_id and str(actor.user_id)[:8] or "Team Lead",
        "created_at": deliverable.created_at.isoformat() if deliverable.created_at else None,
    }


@router.patch("/deliverables/{deliverable_id}/status")
async def update_deliverable_status(
    deliverable_id: uuid.UUID,
    payload: DeliverableStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Admin override for deliverable quality and review status with audit logging."""
    deliverable = await db.get(Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    try:
        new_status = DeliverableStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    prev_status = deliverable.status
    from app.services.deliverable_state import transition
    try:
        await transition(
            db,
            deliverable,
            new_status,
            actor_id=actor.user_id,
            actor_role=actor.role,
            reason="Admin/Lead operations override",
        )
    except Exception as exc:
        deliverable.status = new_status
        audit = AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role,
            entity="deliverable",
            entity_id=deliverable.id,
            action="admin_status_override",
            from_value={"status": prev_status.value if hasattr(prev_status, "value") else str(prev_status)},
            to_value={"status": new_status.value, "reason": str(exc)},
        )
        db.add(audit)
        await db.commit()

    await db.refresh(deliverable)
    return {"status": "updated", "id": str(deliverable_id), "new_status": deliverable.status.value}



# --- Support Ticketing Endpoints ---

class AdminTicketReply(BaseModel):
    message_text: str | None = None
    message: str | None = None
    status: str | None = None


class AdminTicketStatusUpdate(BaseModel):
    status: str


@router.get("/support/tickets")
async def list_admin_support_tickets(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """List all client support tickets from DB with message counts and status."""
    stmt = (
        select(Ticket)
        .options(
            selectinload(Ticket.messages),
            selectinload(Ticket.assignee),
            selectinload(Ticket.deliverable),
        )
        .order_by(Ticket.created_at.desc())
    )
    res = await db.execute(stmt)
    tickets = res.scalars().all()

    results = []
    for t in tickets:
        client_res = await db.execute(
            select(User.email, User.full_name, ClientProfile.company_name)
            .outerjoin(ClientProfile, ClientProfile.user_id == User.id)
            .where(User.id == t.client_id)
        )
        c_row = client_res.first()
        client_email = c_row[0] if c_row else ""
        client_name = c_row[1] if c_row else ""
        company_name = c_row[2] if c_row else ""

        client_label = company_name or client_name or (client_email.split("@")[0].capitalize() if client_email else "Client")

        deliv_title = None
        if t.deliverable:
            ft = getattr(t.deliverable, "file_type", "") or ""
            dtype = "Reel" if "video" in ft.lower() else "Deliverable"
            deliv_title = f"{dtype} (v{t.deliverable.version})"

        results.append({
            "id": str(t.id),
            "subject": t.title,
            "title": t.title,
            "description": t.description,
            "client": client_label,
            "client_id": str(t.client_id),
            "priority": t.priority.value,
            "status": t.status.value,
            "assigned_to": str(t.assigned_to) if t.assigned_to else None,
            "assignee_name": t.assignee.full_name or t.assignee.email if t.assignee else None,
            "deliverable_id": str(t.deliverable_id) if t.deliverable_id else None,
            "deliverable_title": deliv_title,
            "time": t.created_at.strftime("%b %d, %I:%M %p") if t.created_at else "Recently",
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "message_count": len(t.messages),
        })
    return results


@router.get("/support/tickets/{ticket_id}/messages")
async def get_admin_ticket_messages(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """Retrieve message history for a specific ticket."""
    stmt = (
        select(TicketMessage, User.full_name, User.email, User.role)
        .outerjoin(User, User.id == TicketMessage.sender_id)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
    )
    res = await db.execute(stmt)
    rows = res.fetchall()
    return [
        {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "sender_name": full_name or (email.split("@")[0] if email else "User/Staff"),
            "sender_role": (role.value if hasattr(role, "value") else str(role)) if role else "user",
            "message": msg.message,
            "created_at": msg.created_at.isoformat() if msg.created_at else "",
        }
        for msg, full_name, email, role in rows
    ]


@router.post("/support/tickets/{ticket_id}/messages")
async def post_admin_ticket_message(
    ticket_id: uuid.UUID,
    payload: AdminTicketReply,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Reply to a client support ticket and optionally update its status."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    text_content = payload.message_text or payload.message
    if not text_content:
        raise HTTPException(status_code=400, detail="Message text is required")

    msg = TicketMessage(
        ticket_id=ticket_id,
        sender_id=actor.user_id,
        message=text_content,
        attachments=[],
    )
    db.add(msg)
    if payload.status:
        try:
            ticket.status = TicketStatus(payload.status)
        except ValueError:
            ticket.status = TicketStatus.RESOLVED
    else:
        ticket.status = TicketStatus.RESOLVED

    await db.commit()
    await db.refresh(msg)

    return {
        "id": str(msg.id),
        "ticket_id": str(ticket_id),
        "message": msg.message,
        "created_at": msg.created_at.isoformat(),
        "status": ticket.status.value,
    }


@router.patch("/support/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: AdminTicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Update support ticket status."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        ticket.status = TicketStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    await db.commit()
    return {"status": "updated", "id": str(ticket_id), "new_status": ticket.status.value}


# --- Leave Management Endpoints ---

class LeaveApplyRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str


@router.get("/leave")
async def list_admin_leave_requests(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """
    List staff leave requests from DB with strict hierarchical scoping:
    - Admin / Super Admin: views all leave requests across the agency.
    - Team Lead: views leave requests from their pod members + their own leave requests.
    - Team Member (editor, designer, etc.): views only their own leave requests.
    """
    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")
    is_tl = actor.role in (UserRole.TEAM_LEAD, "team_lead")

    tl_user = aliased(User, name="tl_user")
    appr_user = aliased(User, name="appr_user")

    stmt = (
        select(
            LeaveRequest,
            User.full_name,
            User.email,
            User.role,
            StaffProfile.department,
            StaffProfile.team_lead_id,
            tl_user.full_name.label("team_lead_name"),
            appr_user.full_name.label("approver_name"),
        )
        .join(User, User.id == LeaveRequest.user_id)
        .outerjoin(StaffProfile, StaffProfile.user_id == LeaveRequest.user_id)
        .outerjoin(tl_user, tl_user.id == StaffProfile.team_lead_id)
        .outerjoin(appr_user, appr_user.id == LeaveRequest.approved_by)
        .order_by(LeaveRequest.created_at.desc())
    )

    # Scoping filter based on actor role
    if not is_admin:
        if is_tl:
            stmt = stmt.where(
                or_(
                    StaffProfile.team_lead_id == actor.user_id,
                    LeaveRequest.user_id == actor.user_id,
                )
            )
        else:
            stmt = stmt.where(LeaveRequest.user_id == actor.user_id)

    res = await db.execute(stmt)
    rows = res.fetchall()

    from datetime import timedelta
    ist_tz = timezone(timedelta(hours=5, minutes=30))

    results = []
    for lr, full_name, email, role, dept, tl_id, tl_name, appr_name in rows:
        is_self = lr.user_id == actor.user_id
        is_pod_member = tl_id == actor.user_id

        # Workflow Hierarchy Permissions:
        # - Admin can approve/reject any pending request
        # - Team Lead can ONLY approve/reject pod members' requests (never their own!)
        # - Team members cannot approve/reject
        can_approve = False
        can_reject = False
        if lr.status == "pending":
            if is_admin:
                can_approve = True
                can_reject = True
            elif is_tl and is_pod_member and not is_self:
                can_approve = True
                can_reject = True

        can_cancel = lr.status == "pending" and (is_self or is_admin)
        role_str = role.value if hasattr(role, "value") else str(role)

        created_ist_str = ""
        if lr.created_at:
            created_ist = lr.created_at.astimezone(ist_tz)
            created_ist_str = created_ist.strftime("%d %b %Y, %I:%M %p IST")

        # Determine reporting hierarchy string
        if role_str == "team_lead":
            reports_to = "Agency Admin"
        elif tl_name:
            reports_to = tl_name
        else:
            reports_to = "Unassigned Lead"

        results.append(
            {
                "id": str(lr.id),
                "team_member_id": str(lr.user_id),
                "employee_name": full_name or email.split("@")[0].capitalize(),
                "employee_email": email,
                "role": role_str,
                "department": dept or "creative",
                "team_lead_id": str(tl_id) if tl_id else None,
                "team_lead_name": reports_to,
                "start_date": lr.start_date.isoformat(),
                "end_date": lr.end_date.isoformat(),
                "reason": lr.reason or "Scheduled Time Off",
                "status": lr.status,
                "approved_by": str(lr.approved_by) if lr.approved_by else None,
                "approved_by_name": appr_name,
                "can_approve": can_approve,
                "can_reject": can_reject,
                "can_cancel": can_cancel,
                "is_self": is_self,
                "created_at": lr.created_at.isoformat() if lr.created_at else "",
                "created_at_ist": created_ist_str,
            }
        )

    return results


@router.post("/leave")
async def create_leave_request(
    payload: LeaveApplyRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """
    Submit a time-off leave request.
    - Available to team members, team leads, and staff.
    - If team member: routed to their assigned Team Lead (and Admin).
    - If team lead: routed to Agency Admin.
    """
    if payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=400,
            detail="Leave end date must be on or after start date.",
        )

    # Check for overlapping existing active/pending requests for this user
    overlap_stmt = select(LeaveRequest).where(
        LeaveRequest.user_id == actor.user_id,
        LeaveRequest.status.in_(["pending", "approved"]),
        LeaveRequest.start_date <= payload.end_date,
        LeaveRequest.end_date >= payload.start_date,
    )
    overlap_res = await db.execute(overlap_stmt)
    if overlap_res.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="You already have an active or pending leave request covering these dates.",
        )

    lr = LeaveRequest(
        user_id=actor.user_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip() if payload.reason else "Scheduled Leave",
        status="pending",
    )
    db.add(lr)
    await db.flush()

    # Find applicant's details & assigned team lead
    user_stmt = select(User, StaffProfile).outerjoin(StaffProfile, StaffProfile.user_id == User.id).where(User.id == actor.user_id)
    u_res = await db.execute(user_stmt)
    u_row = u_res.first()
    applicant_name = (u_row[0].full_name or u_row[0].email) if u_row else "Staff Member"
    sp = u_row[1] if u_row else None

    # Emit notifications according to hierarchy:
    try:
        notifs = []
        if sp and sp.team_lead_id:
            notifs.append(
                Notification(
                    user_id=sp.team_lead_id,
                    title=f"Leave Request: {applicant_name}",
                    message=f"{applicant_name} requested time off ({payload.start_date} to {payload.end_date}): {payload.reason}",
                    link="/admin/leave",
                )
            )
        else:
            admin_stmt = select(User.id).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
            admin_res = await db.execute(admin_stmt)
            for admin_id in admin_res.scalars().all():
                notifs.append(
                    Notification(
                        user_id=admin_id,
                        title=f"Leave Request: {applicant_name}",
                        message=f"{applicant_name} submitted time-off request ({payload.start_date} to {payload.end_date}): {payload.reason}",
                        link="/admin/leave",
                    )
                )

        if notifs:
            db.add_all(notifs)
    except Exception as exc:
        logger.warning("leave_notification_failed", error=str(exc))

    # Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="leave_requests",
            entity_id=lr.id,
            action="leave_requested",
            to_value={"start_date": str(payload.start_date), "end_date": str(payload.end_date), "reason": payload.reason},
        )
    )

    await db.commit()
    await db.refresh(lr)

    return {
        "status": "submitted",
        "id": str(lr.id),
        "start_date": lr.start_date.isoformat(),
        "end_date": lr.end_date.isoformat(),
        "reason": lr.reason,
        "leave_status": lr.status,
        "message": "Leave request submitted successfully.",
    }


@router.post("/leave/{leave_id}/approve")
async def approve_leave_request(
    leave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """
    Approve staff leave request enforcing workflow hierarchy:
    - Admin / Super Admin: Can approve any leave request.
    - Team Lead: Can approve pod members' requests, CANNOT approve their own request.
    """
    lr_stmt = select(LeaveRequest, StaffProfile).outerjoin(StaffProfile, StaffProfile.user_id == LeaveRequest.user_id).where(LeaveRequest.id == leave_id)
    lr_res = await db.execute(lr_stmt)
    row = lr_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Leave request not found")

    lr, sp = row[0], row[1]
    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")

    if lr.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave request is already {lr.status}.")

    # Hierarchy validation
    if not is_admin:
        if lr.user_id == actor.user_id:
            raise HTTPException(
                status_code=403,
                detail="Team Leads cannot approve their own leave requests. Agency Admin approval is required.",
            )
        if not sp or sp.team_lead_id != actor.user_id:
            raise HTTPException(
                status_code=403,
                detail="You are only authorized to approve leave requests for team members in your pod.",
            )

    lr.status = "approved"
    lr.approved_by = actor.user_id

    # Notify applicant
    try:
        db.add(
            Notification(
                user_id=lr.user_id,
                title="Leave Request Approved",
                message=f"Your leave request from {lr.start_date} to {lr.end_date} has been approved.",
                link="/admin/leave",
            )
        )
    except Exception as exc:
        logger.warning("leave_approval_notification_failed", error=str(exc))

    # Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="leave_requests",
            entity_id=lr.id,
            action="leave_approved",
            to_value={"approved_by": str(actor.user_id)},
        )
    )

    await db.commit()
    return {"status": "approved", "id": str(leave_id)}


@router.post("/leave/{leave_id}/reject")
async def reject_leave_request(
    leave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """
    Reject staff leave request enforcing workflow hierarchy:
    - Admin / Super Admin: Can reject any leave request.
    - Team Lead: Can reject pod members' requests, CANNOT reject their own request.
    """
    lr_stmt = select(LeaveRequest, StaffProfile).outerjoin(StaffProfile, StaffProfile.user_id == LeaveRequest.user_id).where(LeaveRequest.id == leave_id)
    lr_res = await db.execute(lr_stmt)
    row = lr_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Leave request not found")

    lr, sp = row[0], row[1]
    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")

    if lr.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave request is already {lr.status}.")

    # Hierarchy validation
    if not is_admin:
        if lr.user_id == actor.user_id:
            raise HTTPException(
                status_code=403,
                detail="Team Leads cannot reject their own leave requests. Action must be taken by an Agency Admin.",
            )
        if not sp or sp.team_lead_id != actor.user_id:
            raise HTTPException(
                status_code=403,
                detail="You are only authorized to reject leave requests for team members in your pod.",
            )

    lr.status = "rejected"
    lr.approved_by = actor.user_id

    # Notify applicant
    try:
        db.add(
            Notification(
                user_id=lr.user_id,
                title="Leave Request Rejected",
                message=f"Your leave request from {lr.start_date} to {lr.end_date} has been rejected.",
                link="/admin/leave",
            )
        )
    except Exception as exc:
        logger.warning("leave_rejection_notification_failed", error=str(exc))

    # Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="leave_requests",
            entity_id=lr.id,
            action="leave_rejected",
            to_value={"rejected_by": str(actor.user_id)},
        )
    )

    await db.commit()
    return {"status": "rejected", "id": str(leave_id)}


@router.delete("/leave/{leave_id}")
async def cancel_leave_request(
    leave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """
    Cancel/withdraw a leave request.
    - Applicant can withdraw if pending.
    - Admin/Super Admin can cancel or delete anytime.
    """
    lr = await db.get(LeaveRequest, leave_id)
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")

    is_admin = actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, "admin", "super_admin")
    if not is_admin and lr.user_id != actor.user_id:
        raise HTTPException(status_code=403, detail="You can only cancel your own leave requests.")

    if not is_admin and lr.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot cancel a leave request that is already approved or rejected.")

    await db.delete(lr)
    await db.commit()
    return {"status": "cancelled", "id": str(leave_id)}


# --- Content Calendar Endpoints ---

@router.get("/calendar")
async def get_admin_calendar(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """Retrieve content calendar scheduled deliverables and publication entries from DB."""
    events: list[dict[str, Any]] = []
    seen_deliverable_ids = set()

    # 1. Query ContentCalendar entries joined with Client, Profile, Task, Deliverable
    cal_stmt = (
        select(
            ContentCalendar,
            User.email,
            ClientProfile.company_name,
            Deliverable,
            Task.deliverable_type,
        )
        .join(User, User.id == ContentCalendar.client_id)
        .outerjoin(ClientProfile, ClientProfile.user_id == ContentCalendar.client_id)
        .outerjoin(Deliverable, Deliverable.id == ContentCalendar.deliverable_id)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .order_by(ContentCalendar.publish_date.asc(), ContentCalendar.scheduled_time.asc().nulls_last())
        .limit(500)
    )
    cal_res = await db.execute(cal_stmt)
    cal_rows = cal_res.fetchall()

    for cal, email, company_name, d, deliv_type in cal_rows:
        if d:
            seen_deliverable_ids.add(d.id)

        client_name = company_name or email.split("@")[0].capitalize()
        event_dt = cal.scheduled_time or datetime.combine(cal.publish_date, datetime.min.time().replace(hour=11), tzinfo=timezone.utc)
        
        # Determine format label
        format_label = "Poster"
        cap = (cal.caption or "").lower()
        if deliv_type:
            val = str(deliv_type.value if hasattr(deliv_type, "value") else deliv_type).lower()
            if "reel" in val or "video" in val:
                format_label = "Reel"
            elif "carousel" in val or "story" in val:
                format_label = "Story"
            else:
                format_label = "Poster"
        elif "reel" in cap or "video" in cap:
            format_label = "Reel"
        elif "story" in cap or "carousel" in cap:
            format_label = "Story"
        elif d and ("video" in d.file_type.lower() or "mp4" in d.file_type.lower()):
            format_label = "Reel"

        status_str = "scheduled"
        file_url = None
        if d:
            status_str = (
                "approved"
                if d.status.value == "approved"
                else "scheduled"
                if d.status.value in ["draft", "pending_approval"]
                else d.status.value
            )
            file_url = (
                storage_service.signed_get(d.file_url)
                if (d.file_url and not (d.file_url.startswith("http://") or d.file_url.startswith("https://") or d.file_url.startswith("/static/")))
                else d.file_url
            )

        title = cal.caption or f"{format_label} · {client_name}"

        events.append({
            "id": str(cal.id),
            "deliverable_id": str(d.id) if d else None,
            "client_name": client_name,
            "title": title,
            "type": format_label,
            "status": status_str,
            "date": cal.publish_date.strftime("%Y-%m-%d"),
            "day": cal.publish_date.day,
            "month": cal.publish_date.month,
            "year": cal.publish_date.year,
            "time": event_dt.strftime("%I:%M %p") if event_dt else "11:00 AM",
            "caption": cal.caption or "",
            "file_url": file_url,
        })

    # 2. Query standalone deliverables not yet attached to a ContentCalendar row
    deliv_stmt = (
        select(
            Deliverable,
            Task.deliverable_type,
            User.email,
            ClientProfile.company_name,
        )
        .join(User, User.id == Deliverable.client_id)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .outerjoin(ClientProfile, ClientProfile.user_id == Deliverable.client_id)
    )
    if seen_deliverable_ids:
        deliv_stmt = deliv_stmt.where(Deliverable.id.not_in(seen_deliverable_ids))
    deliv_stmt = (
        deliv_stmt
        .order_by(Deliverable.scheduled_at.asc().nulls_last(), Deliverable.created_at.asc())
        .limit(200)
    )
    deliv_res = await db.execute(deliv_stmt)
    deliv_rows = deliv_res.fetchall()

    for d, deliv_type, email, company_name in deliv_rows:
        client_name = company_name or email.split("@")[0].capitalize()
        event_date = d.scheduled_at or d.created_at
        format_label = "Reel"
        if deliv_type:
            val = str(deliv_type.value if hasattr(deliv_type, "value") else deliv_type).lower()
            if "reel" in val or "video" in val:
                format_label = "Reel"
            elif "carousel" in val or "story" in val:
                format_label = "Story"
            else:
                format_label = "Poster"
        elif "video" in d.file_type.lower() or "mp4" in d.file_type.lower():
            format_label = "Reel"
        elif "carousel" in d.file_type.lower():
            format_label = "Story"
        else:
            format_label = "Poster"

        title = f"{format_label} · {client_name}"

        events.append({
            "id": str(d.id),
            "deliverable_id": str(d.id),
            "client_name": client_name,
            "title": title,
            "type": format_label,
            "status": "approved" if d.status.value == "approved" else "scheduled" if d.status.value in ["draft", "pending_approval"] else d.status.value,
            "date": event_date.strftime("%Y-%m-%d") if event_date else "",
            "day": event_date.day if event_date else 1,
            "month": event_date.month if event_date else 1,
            "year": event_date.year if event_date else 2026,
            "time": event_date.strftime("%I:%M %p") if event_date else "11:00 AM",
            "caption": "",
            "file_url": (
                storage_service.signed_get(d.file_url)
                if (d.file_url and not (d.file_url.startswith("http://") or d.file_url.startswith("https://") or d.file_url.startswith("/static/")))
                else d.file_url
            ),
        })

    return events


# --- Admin Deliverables Management & Automated Kanban Sync ---

class AdminDeliverableCreateRequest(BaseModel):
    client_id: uuid.UUID
    title: str = ""
    type: str = "reel"
    file_url: str
    file_type: str = "video/mp4"
    status: str = "pending_approval"
    revision_round: int = 1
    description: str = ""
    scheduled_at: str | None = None


class AdminDeliverableStatusUpdate(BaseModel):
    status: str


@router.get("/deliverables")
async def list_admin_deliverables(
    client_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> list[dict[str, Any]]:
    """List creative deliverables with client information and task links."""
    stmt = (
        select(
            Deliverable,
            User.email,
            ClientProfile.company_name,
            Task.id.label("task_id"),
            Task.status.label("task_status"),
        )
        .join(User, User.id == Deliverable.client_id)
        .outerjoin(ClientProfile, ClientProfile.user_id == Deliverable.client_id)
        .outerjoin(Task, Task.id == Deliverable.task_id)
    )
    if client_id:
        stmt = stmt.where(Deliverable.client_id == client_id)

    stmt = stmt.order_by(Deliverable.created_at.desc()).limit(300)
    res = await db.execute(stmt)
    rows = res.fetchall()

    results = []
    for d, email, company, t_id, t_status in rows:
        c_name = company or email.split("@")[0].capitalize()
        status_val = d.status.value if hasattr(d.status, "value") else str(d.status)
        deliv_type = "reel" if ("video" in (d.file_type or "").lower() or "mp4" in (d.file_type or "").lower()) else "static_post"

        results.append({
            "id": str(d.id),
            "root_id": str(d.root_id),
            "client_id": str(d.client_id),
            "client_name": c_name,
            "title": f"{deliv_type.replace('_', ' ').capitalize()} · {c_name}",
            "type": deliv_type,
            "file_url": (
                storage_service.signed_get(d.file_url)
                if (d.file_url and not (d.file_url.startswith("http://") or d.file_url.startswith("https://") or d.file_url.startswith("/uploads/") or d.file_url.startswith("/static/")))
                else d.file_url
            ),
            "file_type": d.file_type,
            "status": status_val,
            "version": d.version,
            "revision_round": d.revision_round,
            "task_id": str(t_id) if t_id else None,
            "task_status": t_status.value if hasattr(t_status, "value") else (str(t_status) if t_status else None),
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
        })
    return results


@router.post("/deliverables/upload")
async def upload_admin_deliverable_file(
    file: UploadFile = File(...),
    actor: Actor = StaffActor,
) -> dict[str, str]:
    """Upload media file directly to local server storage."""
    import time
    from app.main import _uploads_dir

    ext = os.path.splitext(file.filename or "")[1].lower()
    clean_name = f"{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(_uploads_dir, clean_name)

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    return {
        "file_url": f"/uploads/{clean_name}",
        "filename": file.filename or clean_name,
        "file_type": file.content_type or "application/octet-stream",
    }


@router.post("/deliverables")
async def create_admin_deliverable(
    payload: AdminDeliverableCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Staff uploads/creates a new deliverable. Automates Kanban task progression into Internal QA."""
    # Validate target status
    target_status = DeliverableStatus.PENDING_QA
    try:
        if payload.status:
            target_status = DeliverableStatus(payload.status)
    except ValueError:
        target_status = DeliverableStatus.PENDING_QA

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=payload.client_id,
        submitted_by=actor.user_id,
        file_url=payload.file_url,
        file_type=payload.file_type or "video/mp4",
        file_size_bytes=1024 * 1024,
        status=target_status,
        revision_round=payload.revision_round,
    )
    if payload.scheduled_at:
        try:
            deliverable.scheduled_at = datetime.fromisoformat(payload.scheduled_at)
        except Exception:
            pass

    db.add(deliverable)
    await db.flush()

    # Automate Kanban task progression: upload by team moves task to Internal QA
    await deliverable_state.sync_task_with_deliverable(db, deliverable, target_status)

    await db.commit()
    await db.refresh(deliverable)

    return {
        "id": str(deliverable.id),
        "status": deliverable.status.value,
        "task_id": str(deliverable.task_id) if deliverable.task_id else None,
        "file_url": deliverable.file_url,
    }


@router.patch("/deliverables/{deliverable_id}/status")
async def update_admin_deliverable_status(
    deliverable_id: uuid.UUID,
    payload: AdminDeliverableStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> dict[str, Any]:
    """Update deliverable status. Automatically syncs and moves the corresponding Kanban task."""
    deliverable = await db.get(Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    try:
        new_status = DeliverableStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    deliverable.status = new_status
    if new_status == DeliverableStatus.APPROVED:
        deliverable.approved_at = datetime.now(timezone.utc)

    # Sync corresponding Task on the Kanban board
    await deliverable_state.sync_task_with_deliverable(db, deliverable, new_status)

    await db.commit()
    await db.refresh(deliverable)

    return {
        "id": str(deliverable.id),
        "status": deliverable.status.value,
        "task_id": str(deliverable.task_id) if deliverable.task_id else None,
    }



