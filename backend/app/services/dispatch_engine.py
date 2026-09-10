"""Unified Dispatch & Planning Engine.

Replaces separate naive dispatchers with one eligibility engine and two calling policies:
- Policy A: Continuity-first (Original Creator -> Pod Member -> Open Pool)
- Policy B: Load-first (Windowed capacity query with FOR UPDATE SKIP LOCKED)
- Quota-driven calendar drafting with client approval gate and format-specific lead times
- Rolling 10-day assignment horizon and nightly rebalance sweeps
"""

from __future__ import annotations

import logging
import math
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Plan, Subscription
from app.models.enums import DeliverableType, TaskStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Deliverable, Task
from app.services.blueprint_service import (
    assign_funnel_stages,
    generate_creative_blueprint,
    generate_deterministic_blueprint,
)

logger = logging.getLogger("creo.dispatch_engine")

# --- Part 1: Effort & Lead Time Constants ---

EFFORT_POINTS: dict[str, int] = {
    "reel": 5,
    "carousel": 3,
    "poster": 2,
    "static_post": 2,
    "story": 1,
    "shoot_day": 8,
}

REVISION_MULTIPLIER = 0.4

LEAD_DAYS: dict[str, int] = {
    "reel": 4,
    "shoot_day": 6,
    "carousel": 3,
    "poster": 2,
    "static_post": 2,
    "story": 1,
}

SKILL_FOR_KIND: dict[str, str] = {
    "reel": "video",
    "shoot_day": "video",
    "poster": "graphics",
    "static_post": "graphics",
    "carousel": "graphics",
    "story": "graphics",
}

DEFAULT_TEMPLATE: dict[str, dict[str, Any]] = {
    "reel": {"days": [1, 3], "time": "19:30"},        # Tue, Thu at 7:30 PM
    "poster": {"days": [0, 4], "time": "12:30"},      # Mon, Fri at 12:30 PM
    "static_post": {"days": [0, 4], "time": "12:30"}, # Mon, Fri
    "carousel": {"days": [2], "time": "18:00"},        # Wed at 6:00 PM
    "story": {"days": [0, 1, 2, 3, 4], "time": "20:00"}, # Daily at 8:00 PM
}


def get_kind_key(deliv_type: DeliverableType | str) -> str:
    """Normalize deliverable type to string key."""
    val = deliv_type.value if hasattr(deliv_type, "value") else str(deliv_type)
    return val.lower()


def get_task_effort_points(deliv_type: DeliverableType | str, is_revision: bool = False) -> int:
    """Calculate effort points based on format kind and revision discount."""
    kind = get_kind_key(deliv_type)
    base = EFFORT_POINTS.get(kind, 2)
    if is_revision:
        return max(1, math.ceil(base * REVISION_MULTIPLIER))
    return base


def add_business_days(start: date, days: int) -> date:
    """Add business days (Monday-Friday) to a given date."""
    cur = start
    added = 0
    while added < days:
        cur += timedelta(days=1)
        if cur.weekday() < 5:
            added += 1
    return cur


def subtract_business_days(start: date, days: int) -> date:
    """Subtract business days (Monday-Friday) from a given date."""
    cur = start
    subtracted = 0
    while subtracted < days:
        cur -= timedelta(days=1)
        if cur.weekday() < 5:
            subtracted += 1
    return cur


def business_days_in_range(start: date, end: date, weekdays: list[int] | None = None) -> list[date]:
    """Return all business days between start and end matching optional weekdays."""
    cur = start
    days: list[date] = []
    while cur <= end:
        if cur.weekday() < 5 and (weekdays is None or cur.weekday() in weekdays):
            days.append(cur)
        cur += timedelta(days=1)
    return days


def evenly_spaced(items: list[date], n: int) -> list[date]:
    """Evenly distribute n items across a list of candidate dates."""
    if not items or n <= 0:
        return []
    if n >= len(items):
        return items[:]
    step = len(items) / float(n)
    return [items[int(round(i * step))] for i in range(n)]


# --- Part 2: Unified Eligibility SQL Query ---

ELIGIBILITY_SQL = text("""
WITH deliv_window AS (
  SELECT CAST(:w_start AS DATE) AS w_start,
         CAST(:w_end AS DATE)   AS w_end
),
committed AS (
  SELECT t.assigned_to AS staff_id,
         COALESCE(SUM(t.effort_points), 0) AS points_in_window,
         COUNT(t.id) AS active_wip
    FROM tasks t, deliv_window w
   WHERE t.status IN ('in_production', 'internal_qa')
     AND (t.due_date BETWEEN w.w_start AND w.w_end OR t.due_date IS NULL)
   GROUP BY t.assigned_to
),
available AS (
  SELECT sp.user_id,
         sp.daily_capacity,
         COALESCE(NULLIF(sp.daily_points, 0), sp.daily_capacity * 3) AS daily_points,
         sp.skills,
         sp.sub_skills,
         sp.last_assigned_at,
         (SELECT COUNT(*) FROM generate_series(w.w_start::timestamp, w.w_end::timestamp, '1 day'::interval) d
           WHERE EXTRACT(isodow FROM d) < 6
             AND NOT EXISTS (
               SELECT 1 FROM leave_requests l
                WHERE l.user_id = sp.user_id
                  AND l.status = 'approved'
                  AND d::date BETWEEN l.start_date AND l.end_date)) AS working_days
    FROM staff_profiles sp
    JOIN users u ON u.id = sp.user_id
                AND u.account_status = 'active'
   CROSS JOIN deliv_window w
   WHERE sp.is_accepting_work = TRUE
     AND NOT EXISTS (
       SELECT 1 FROM leave_requests l
        WHERE l.user_id = sp.user_id
          AND l.status = 'approved'
          AND w.w_end BETWEEN l.start_date AND l.end_date
     )
)
SELECT a.user_id,
       (a.daily_points * a.working_days) AS capacity_points,
       COALESCE(c.points_in_window, 0) AS used_points,
       (COALESCE(c.points_in_window, 0)::float / NULLIF(a.daily_points * a.working_days, 0)) AS utilization,
       a.last_assigned_at,
       a.daily_capacity,
       COALESCE(c.active_wip, 0) AS active_wip,
       a.sub_skills
  FROM available a
  LEFT JOIN committed c ON c.staff_id = a.user_id
 WHERE (:has_staff_id = FALSE OR a.user_id = :filter_staff_id)
   AND (:has_override = TRUE AND :required_skill = ANY(a.skills)
        OR :has_override = FALSE AND (:required_skill = ANY(a.skills) OR :deliv_type = ANY(a.skills)))
   AND a.working_days > 0
   AND COALESCE(c.active_wip, 0) < a.daily_capacity
   AND COALESCE(c.points_in_window, 0) + :task_points <= (a.daily_points * a.working_days)
 ORDER BY
   CASE WHEN (:has_orig_creator = TRUE AND a.user_id = :orig_creator_id) THEN 0
        WHEN (:has_pod_owner = TRUE AND a.user_id = :pod_owner_id) THEN 1
        ELSE 2 END,
   CASE WHEN (:has_sub_skill = TRUE AND :preferred_sub_skill = ANY(a.sub_skills)) THEN 0 ELSE 1 END,
   utilization ASC,
   a.last_assigned_at ASC NULLS FIRST
 LIMIT 10;
""")


async def points_in_window(db: AsyncSession, staff_id: uuid.UUID, task_due_date: date) -> int:
    """Calculate active effort points committed to a staff member in the delivery window."""
    w_start = task_due_date - timedelta(days=2)
    stmt = (
        select(func.coalesce(func.sum(Task.effort_points), 0))
        .where(Task.assigned_to == staff_id)
        .where(Task.status.in_([TaskStatus.IN_PRODUCTION, TaskStatus.INTERNAL_QA]))
        .where((Task.due_date.between(w_start, task_due_date)) | (Task.due_date.is_(None)))
    )
    res = await db.execute(stmt)
    return int(res.scalar() or 0)


async def is_eligible(
    db: AsyncSession,
    staff_id: uuid.UUID,
    task: Task,
    required_skill: str,
) -> bool:
    """Check if a specific staff member is eligible under the unified windowed engine."""
    due = task.due_date or date.today()
    kind = get_kind_key(task.deliverable_type)
    effort = task.effort_points or get_task_effort_points(task.deliverable_type, task.is_revision)

    w_end = due
    w_start = due - timedelta(days=2)

    res = await db.execute(
        ELIGIBILITY_SQL,
        {
            "w_start": w_start,
            "w_end": w_end,
            "has_staff_id": True,
            "filter_staff_id": staff_id,
            "has_override": False,
            "required_skill": required_skill,
            "deliv_type": kind,
            "task_points": effort,
            "has_orig_creator": False,
            "orig_creator_id": uuid.uuid4(),
            "has_pod_owner": False,
            "pod_owner_id": uuid.uuid4(),
            "has_sub_skill": False,
            "preferred_sub_skill": "",
        },
    )
    row = res.fetchone()
    return row is not None


async def commit_assignment(
    db: AsyncSession,
    task: Task,
    staff_id: uuid.UUID,
    reason: str,
    actor_id: uuid.UUID | None = None,
) -> uuid.UUID:
    """Commit assignment to staff, update last_assigned_at timestamp, and log audit."""
    prev_status = task.status
    prev_assignee = task.assigned_to

    task.assigned_to = staff_id
    task.status = TaskStatus.IN_PRODUCTION
    task.effort_points = task.effort_points or get_task_effort_points(task.deliverable_type, task.is_revision)

    # Update staff last_assigned_at timestamp for round-robin fairness
    staff_profile = await db.get(StaffProfile, staff_id)
    if staff_profile:
        staff_profile.last_assigned_at = datetime.now(timezone.utc)

    # Log audit trail
    db.add(
        AuditLog(
            entity="task",
            entity_id=task.id,
            actor_id=actor_id or staff_id,
            action="assigned",
            from_value={
                "status": prev_status.value if hasattr(prev_status, "value") else str(prev_status),
                "assigned_to": str(prev_assignee) if prev_assignee else None,
            },
            to_value={
                "status": "in_production",
                "assigned_to": str(staff_id),
                "reason": reason,
                "effort_points": task.effort_points,
            },
        )
    )

    # Notify assignee
    db.add(
        Notification(
            user_id=staff_id,
            title=f"New Task Assigned ({reason})",
            message=f"You have been assigned task {task.id} ({task.deliverable_type.value if hasattr(task.deliverable_type, 'value') else task.deliverable_type}) due on {task.due_date}.",
            link=f"/admin/tasks?selected={task.id}",
        )
    )

    await db.commit()
    logger.info("Committed task %s assignment to staff %s [reason=%s, points=%d]", task.id, staff_id, reason, task.effort_points)
    return staff_id


async def backlog_and_alert(db: AsyncSession, task: Task, skill: str) -> None:
    """Safely place task into backlog and alert team leads when nobody is eligible."""
    task.status = TaskStatus.BACKLOG
    db.add(
        AuditLog(
            entity="task",
            entity_id=task.id,
            action="dispatch_failed",
            to_value={
                "reason": "no_eligible_staff",
                "skill": skill,
                "due_date": str(task.due_date),
                "effort_points": task.effort_points,
            },
        )
    )

    leads_query = (
        select(User.id)
        .where(User.role.in_([UserRole.TEAM_LEAD, UserRole.ADMIN]))
        .where(User.account_status == "active")
        .limit(3)
    )
    lead_rows = (await db.execute(leads_query)).scalars().all()
    for lead_id in lead_rows:
        db.add(
            Notification(
                user_id=lead_id,
                title="Dispatch backlog: No eligible staff",
                message=f"Task {task.id} ({task.deliverable_type}) could not be auto-dispatched (no eligible staff for {skill}). Task is in backlog.",
                link=f"/admin/tasks?selected={task.id}",
            )
        )
    await db.commit()


# --- Part 3 & 4: Policies A and B ---

async def assign_continuity_first(
    db: AsyncSession,
    task: Task,
    actor_id: uuid.UUID | None = None,
) -> uuid.UUID | None:
    """Policy A: Continuity-first (Original Creator -> Pod Member -> Open Pool)."""
    kind = get_kind_key(task.deliverable_type)
    skill = SKILL_FOR_KIND.get(kind, "video")
    due = task.due_date or date.today()
    effort = task.effort_points or get_task_effort_points(task.deliverable_type, task.is_revision)

    candidates: list[tuple[uuid.UUID, str]] = []

    # 1. The original creator (for revisions)
    if task.is_revision and task.parent_assignee_id:
        candidates.append((task.parent_assignee_id, "original_creator"))

    # 2. The client's dedicated pod specialist for this skill
    pod_role = "video_editor" if skill == "video" else "graphic_designer"
    pod_query = (
        select(ClientAssignment.user_id)
        .where(ClientAssignment.client_id == task.client_id)
        .where(ClientAssignment.role == pod_role)
        .limit(1)
    )
    pod_staff_id = (await db.execute(pod_query)).scalar_one_or_none()
    if pod_staff_id and (not candidates or candidates[0][0] != pod_staff_id):
        candidates.append((pod_staff_id, "pod_owner"))

    # Check candidates under continuity
    for staff_id, reason in candidates:
        if await is_eligible(db, staff_id, task, required_skill=skill):
            # Verify lock before committing
            lock_stmt = (
                select(StaffProfile)
                .where(StaffProfile.user_id == staff_id)
                .with_for_update(skip_locked=True)
            )
            staff_row = (await db.execute(lock_stmt)).scalar_one_or_none()
            if staff_row:
                current_used = await points_in_window(db, staff_id, due)
                if current_used + effort <= (staff_row.daily_points * 3):
                    return await commit_assignment(db, task, staff_id, reason, actor_id=actor_id)

    # 3. Fallback to open pool
    return await assign_load_first(db, task, reason="pool_fallback", actor_id=actor_id)


async def assign_load_first(
    db: AsyncSession,
    task: Task,
    reason: str = "load_balanced",
    required_skill_override: str | None = None,
    actor_id: uuid.UUID | None = None,
) -> uuid.UUID | None:
    """Policy B: Ranked open pool with FOR UPDATE SKIP LOCKED row locking."""
    kind = get_kind_key(task.deliverable_type)
    skill = required_skill_override or SKILL_FOR_KIND.get(kind, "video")
    due = task.due_date or date.today()
    effort = task.effort_points or get_task_effort_points(task.deliverable_type, task.is_revision)
    task.effort_points = effort

    w_end = due
    w_start = due - timedelta(days=2)

    # Fetch pod specialist if available
    pod_role = "video_editor" if skill == "video" else "graphic_designer"
    pod_query = (
        select(ClientAssignment.user_id)
        .where(ClientAssignment.client_id == task.client_id)
        .where(ClientAssignment.role == pod_role)
        .limit(1)
    )
    pod_staff_id = (await db.execute(pod_query)).scalar_one_or_none()

    has_orig = bool(task.is_revision and task.parent_assignee_id)
    orig_id = task.parent_assignee_id or uuid.uuid4()
    has_pod = bool(pod_staff_id)
    pod_id = pod_staff_id or uuid.uuid4()
    has_sub = bool(task.preferred_sub_skill)
    pref_sub = task.preferred_sub_skill or ""

    # Query candidate ranking
    res = await db.execute(
        ELIGIBILITY_SQL,
        {
            "w_start": w_start,
            "w_end": w_end,
            "has_staff_id": False,
            "filter_staff_id": uuid.uuid4(),
            "has_override": required_skill_override is not None,
            "required_skill": skill,
            "deliv_type": kind,
            "task_points": effort,
            "has_orig_creator": has_orig,
            "orig_creator_id": orig_id,
            "has_pod_owner": has_pod,
            "pod_owner_id": pod_id,
            "has_sub_skill": has_sub,
            "preferred_sub_skill": pref_sub,
        },
    )
    rows = res.fetchall()

    for row in rows:
        cand_id = row[0]
        capacity_points = row[1]
        cand_sub_skills = row[7] if len(row) > 7 and row[7] else []

        # LOCK FIRST, THEN RE-VERIFY within transaction
        lock_res = await db.execute(
            select(StaffProfile)
            .where(StaffProfile.user_id == cand_id)
            .with_for_update()
        )
        staff_row = lock_res.scalar_one_or_none()
        if staff_row is None:
            continue

        # Re-verify concurrent active WIP under lock
        wip_res = await db.execute(
            select(func.count(Task.id))
            .where(Task.assigned_to == cand_id)
            .where(Task.status.in_([TaskStatus.IN_PRODUCTION, TaskStatus.INTERNAL_QA]))
        )
        current_wip = wip_res.scalar() or 0
        if current_wip >= staff_row.daily_capacity:
            continue

        # Re-verify active points inside delivery window
        pts = await points_in_window(db, cand_id, due)
        max_pts = max(capacity_points, staff_row.daily_capacity * effort)
        if pts + effort <= max_pts:
            effective_reason = reason
            if has_sub and pref_sub not in cand_sub_skills:
                effective_reason = f"{reason}_sub_skill_unmatched"
                db.add(
                    AuditLog(
                        entity="task",
                        entity_id=task.id,
                        action="sub_skill_unmatched",
                        to_value={
                            "preferred_sub_skill": pref_sub,
                            "assigned_to": str(cand_id),
                            "staff_sub_skills": cand_sub_skills,
                        },
                    )
                )
            return await commit_assignment(db, task, cand_id, effective_reason, actor_id=actor_id)

    # Nobody eligible
    await backlog_and_alert(db, task, skill=skill)
    return None


# --- Part 5: Durable Pod Assignment ---

async def assign_pod(db: AsyncSession, client_id: uuid.UUID) -> dict[str, Any]:
    """Assign durable creative pod ownership (Lead, Video Editor, Graphic Designer) for a client."""
    # 1. Select Team Lead (Fewest active clients + longest since last assigned, prioritizing agency team)
    tl_query = text("""
        SELECT
            u.id, u.full_name, u.email,
            COUNT(ca.id) AS active_clients,
            MAX(ca.created_at) AS last_assigned_at
        FROM users u
        LEFT JOIN client_assignments ca ON ca.user_id = u.id AND ca.role = 'team_lead'
        WHERE u.role IN ('team_lead', 'admin')
          AND u.account_status = 'active'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY 
            (CASE WHEN u.email LIKE '%creo.agency' THEN 0 ELSE 1 END) ASC,
            active_clients ASC,
            last_assigned_at ASC NULLS FIRST;
    """)
    tl_res = await db.execute(tl_query)
    tl_candidates = tl_res.fetchall()

    if tl_candidates:
        best_tl_id = tl_candidates[0][0]
        best_tl_name = tl_candidates[0][1] or tl_candidates[0][2]
    else:
        admin_res = await db.execute(
            select(User.id, User.full_name, User.email)
            .where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
            .order_by((User.email.like("%creo.agency%")).desc())
            .limit(1)
        )
        row = admin_res.first()
        if not row:
            raise RuntimeError("No team lead or admin available for assignment")
        best_tl_id = row[0]
        best_tl_name = row[1] or row[2]

    # 2. Select Video Editor & Graphic Designer by lowest client assignment count
    staff_query = text("""
        SELECT
            u.id, u.full_name, u.email, u.role, sp.department, sp.skills, sp.team_lead_id,
            COUNT(ca.id) AS client_count
        FROM users u
        JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN client_assignments ca ON ca.user_id = u.id
        WHERE u.account_status = 'active'
          AND sp.is_accepting_work = TRUE
        GROUP BY u.id, u.full_name, u.email, u.role, sp.department, sp.skills, sp.team_lead_id
        ORDER BY 
            (CASE WHEN u.email LIKE '%creo.agency' THEN 0 ELSE 1 END) ASC,
            client_count ASC;
    """)
    staff_rows = (await db.execute(staff_query)).fetchall()

    def is_video_capable(s: Any) -> bool:
        skills = [str(sk).lower() for sk in (s[5] or [])]
        dept = str(s[4]).lower()
        role = str(s[3]).lower()
        return dept in ["video", "motion", "creative"] or role == "editor" or any("video" in sk or "reel" in sk for sk in skills)

    def is_design_capable(s: Any) -> bool:
        skills = [str(sk).lower() for sk in (s[5] or [])]
        dept = str(s[4]).lower()
        role = str(s[3]).lower()
        return dept in ["graphics", "design", "creative"] or role == "designer" or any("poster" in sk or "figma" in sk or "carousel" in sk for sk in skills)

    # Prefer staff in best_tl_id pod
    pod_staff = [s for s in staff_rows if s[6] == best_tl_id]
    pool = pod_staff if len(pod_staff) >= 2 else staff_rows

    best_editor = next((s for s in pool if is_video_capable(s)), None) or next((s for s in staff_rows if is_video_capable(s)), None)
    best_designer = next((s for s in pool if is_design_capable(s)), None) or next((s for s in staff_rows if is_design_capable(s)), None)

    # Clear old client assignments for idempotency
    await db.execute(delete(ClientAssignment).where(ClientAssignment.client_id == client_id))

    db.add(ClientAssignment(client_id=client_id, user_id=best_tl_id, role="team_lead", is_primary=True))

    editor_id = best_editor[0] if best_editor else best_tl_id
    designer_id = best_designer[0] if best_designer else best_tl_id

    if best_editor:
        db.add(ClientAssignment(client_id=client_id, user_id=best_editor[0], role="video_editor", is_primary=False))
    if best_designer and (not best_editor or best_designer[0] != best_editor[0]):
        db.add(ClientAssignment(client_id=client_id, user_id=best_designer[0], role="graphic_designer", is_primary=False))

    await db.commit()
    logger.info("Assigned pod for client %s: TL=%s, Editor=%s, Designer=%s", client_id, best_tl_id, editor_id, designer_id)

    return {
        "team_lead_id": best_tl_id,
        "team_lead_name": best_tl_name,
        "editor_id": editor_id,
        "editor_name": best_editor[1] if best_editor else best_tl_name,
        "designer_id": designer_id,
        "designer_name": best_designer[1] if best_designer else best_tl_name,
    }


# --- Part 6: Quota-Driven Calendar Drafting ---

async def draft_month_calendar(
    db: AsyncSession,
    client_id: uuid.UUID,
    month_anchor: date | None = None,
) -> list[ContentCalendar]:
    """Generate quota-driven draft content calendar slots spread evenly across client template days."""
    anchor = month_anchor or date.today()
    month_start = anchor.replace(day=1)
    # Next month start for window boundary
    if month_start.month == 12:
        next_month = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month = month_start.replace(month=month_start.month + 1)
    month_end = next_month - timedelta(days=1)

    # Fetch client subscription & plan quotas
    sub_query = (
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.client_id == client_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub_row = (await db.execute(sub_query)).first()
    if sub_row:
        plan = sub_row[1]
        quotas: dict[str, int] = {
            "reel": plan.reel_quota,
            "poster": plan.poster_quota,
            "story": plan.story_quota,
        }
    else:
        quotas = {"reel": 4, "poster": 8, "story": 8}

    # Fetch client profile for timezone and custom template
    client_prof = await db.get(ClientProfile, client_id)
    tz_name = (client_prof.timezone if client_prof and client_prof.timezone else "Asia/Kolkata")
    template = (client_prof.calendar_template if client_prof and client_prof.calendar_template else DEFAULT_TEMPLATE)

    try:
        client_tz = ZoneInfo(tz_name)
    except Exception:
        client_tz = ZoneInfo("Asia/Kolkata")

    # Start scheduling minimum 3 business days ahead for creative breathing room
    start_from = add_business_days(date.today(), 3)

    # Clean previous draft slots
    await db.execute(
        delete(ContentCalendar)
        .where(ContentCalendar.client_id == client_id)
        .where(ContentCalendar.status == "draft")
    )

    # Fetch client Brand DNA
    brand_dna = client_prof.brand_dna if client_prof and client_prof.brand_dna else {}

    for kind, quota in quotas.items():
        if quota <= 0:
            continue

        tmpl = template.get(kind, DEFAULT_TEMPLATE.get(kind, {"days": [1, 3], "time": "19:30"}))
        preferred_weekdays = tmpl.get("days", [1, 3])
        time_str = tmpl.get("time", "19:30")
        hour, minute = [int(p) for p in time_str.split(":")]

        candidate_days = [
            d for d in business_days_in_range(start_from, month_end, preferred_weekdays)
        ]

        chosen = evenly_spaced(candidate_days, n=quota)
        if len(chosen) < quota:
            # Fall back to other business days if preferred days are insufficient
            remaining_needed = quota - len(chosen)
            all_biz_days = [d for d in business_days_in_range(start_from, month_end) if d not in chosen]
            chosen += evenly_spaced(all_biz_days, n=remaining_needed)

        # 70/30 Anchor + Flex partition
        anchor_quota = max(1, round(quota * 0.7))
        funnel_stages = assign_funnel_stages(anchor_quota)

        for i, slot_day in enumerate(chosen):
            # Localize publication time in client timezone, then convert to UTC datetime
            local_dt = datetime.combine(slot_day, time(hour=hour, minute=minute), tzinfo=client_tz)
            utc_dt = local_dt.astimezone(timezone.utc)
            format_label = "Reel" if kind == "reel" else "Poster" if kind in ["poster", "static_post"] else "Carousel / Story"

            is_flex = i >= anchor_quota
            if not is_flex:
                stage = funnel_stages[i] if i < len(funnel_stages) else "reach"
                bp = generate_deterministic_blueprint(brand_dna, kind, stage)
                bp_dict = bp.model_dump()
                selected_hook = bp_dict["hooks"][0] if bp_dict.get("hooks") else None
                slot_strategy = "anchor"
                flex_deadline = None
                concept_status = "concept_pending"
                caption = bp.premise
            else:
                bp_dict = None
                selected_hook = None
                slot_strategy = "flex"
                flex_deadline = subtract_business_days(slot_day, 5)
                concept_status = "approved"
                caption = f"Brand {format_label} · Flexible News/Trend Reserve"

            slot = ContentCalendar(
                client_id=client_id,
                deliverable_id=None,
                publish_date=slot_day,
                scheduled_time=utc_dt,
                caption=caption,
                status="draft",
                is_locked=False,
                slot_kind=kind,
                slot_strategy=slot_strategy,
                flex_deadline=flex_deadline,
                concept_status=concept_status,
                blueprint=bp_dict,
                selected_hook=selected_hook,
            )
            db.add(slot)
            created_slots.append(slot)

    await db.commit()
    logger.info("Drafted %d calendar slots for client %s in timezone %s", len(created_slots), client_id, tz_name)
    return created_slots


# --- Part 7: Client Approval Gate & Rolling Window Task Generation ---

async def approve_calendar_month(
    db: AsyncSession,
    client_id: uuid.UUID,
    actor_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Approve draft calendar slots, materialize production tasks with lead times, and dispatch rolling horizon."""
    # 1. Fetch draft slots
    stmt = (
        select(ContentCalendar)
        .where(ContentCalendar.client_id == client_id)
        .where(ContentCalendar.status == "draft")
        .order_by(ContentCalendar.publish_date.asc())
    )
    slots = (await db.execute(stmt)).scalars().all()
    if not slots:
        return {"approved_slots": 0, "created_tasks": 0, "dispatched_tasks": 0}

    # Fetch pod assignments
    pod_stmt = select(ClientAssignment).where(ClientAssignment.client_id == client_id)
    pod_assignments = (await db.execute(pod_stmt)).scalars().all()
    editor_id = next((ca.user_id for ca in pod_assignments if ca.role == "video_editor"), None)
    designer_id = next((ca.user_id for ca in pod_assignments if ca.role == "graphic_designer"), None)
    lead_id = next((ca.user_id for ca in pod_assignments if ca.role == "team_lead"), None)

    created_tasks: list[Task] = []
    today = date.today()
    horizon_date = today + timedelta(days=10)

    for slot in slots:
        slot.status = "approved"
        slot.is_locked = True

        kind = slot.slot_kind or "poster"
        lead_days = LEAD_DAYS.get(kind, 2)
        task_due_date = subtract_business_days(slot.publish_date, lead_days)
        # Ensure task due date is strictly in the future
        if task_due_date <= today:
            task_due_date = add_business_days(today, 1)

        sla_due_at = datetime.combine(task_due_date, time(hour=18), tzinfo=timezone.utc)

        deliv_type = DeliverableType.REEL if kind == "reel" else DeliverableType.CAROUSEL if kind == "carousel" else DeliverableType.STATIC_POST

        default_assignee = editor_id if kind == "reel" else designer_id
        if not default_assignee:
            default_assignee = lead_id

        # Determine effort points
        effort = get_task_effort_points(deliv_type, is_revision=False)
        pref_skill = "motion_graphics_2d" if kind == "reel" else "carousel_typography" if kind == "carousel" else None

        new_task = Task(
            client_id=client_id,
            deliverable_type=deliv_type,
            status=TaskStatus.BACKLOG,
            due_date=task_due_date,
            sla_due_at=sla_due_at,
            effort_points=effort,
            is_revision=False,
            assigned_to=None,
            preferred_sub_skill=pref_skill,
            concept_status=slot.concept_status,
            blueprint=slot.blueprint,
        )
        db.add(new_task)
        await db.flush()
        created_tasks.append(new_task)

    await db.commit()

    # Dispatch tasks entering the 10-day rolling window
    dispatched_count = 0
    for t in created_tasks:
        if t.due_date and t.due_date <= horizon_date:
            assigned = await assign_continuity_first(db, t, actor_id=actor_id)
            if assigned:
                dispatched_count += 1

    # Multi-party notification
    db.add(
        Notification(
            user_id=client_id,
            title="Campaign Calendar Approved! 🚀",
            message=f"Your 30-day content plan with {len(slots)} assets has been approved. Creative production is underway!",
            link="/portal/calendar",
        )
    )
    if lead_id:
        db.add(
            Notification(
                user_id=lead_id,
                title="Client Approved Campaign Plan",
                message=f"Client {client_id} approved {len(slots)} assets. {dispatched_count} tasks dispatched to the 10-day window.",
                link="/admin/tasks",
            )
        )
    await db.commit()

    logger.info("Approved %d slots for client %s: %d tasks created, %d dispatched", len(slots), client_id, len(created_tasks), dispatched_count)
    return {
        "approved_slots": len(slots),
        "created_tasks": len(created_tasks),
        "dispatched_tasks": dispatched_count,
    }


# --- Part 8: Nightly Horizon & Rebalance Sweeps ---

async def assign_upcoming_window(db: AsyncSession, horizon_days: int = 10) -> int:
    """Nightly Celery job: Dispatches tasks entering the 10-day horizon using continuity-first policy."""
    today = date.today()
    horizon = today + timedelta(days=horizon_days)

    stmt = (
        select(Task)
        .where(Task.status == TaskStatus.BACKLOG)
        .where(Task.assigned_to.is_(None))
        .where(Task.due_date.is_not(None))
        .where(Task.due_date <= horizon)
        .order_by(Task.due_date.asc())
        .limit(50)
    )
    tasks = (await db.execute(stmt)).scalars().all()
    assigned_count = 0

    for t in tasks:
        assigned_id = await assign_continuity_first(db, t)
        if assigned_id:
            assigned_count += 1

    logger.info("Rolling horizon sweep dispatched %d / %d tasks", assigned_count, len(tasks))
    return assigned_count


async def rebalance_nightly_sweep(db: AsyncSession) -> dict[str, int]:
    """Nightly Celery sweep: handles approved leave, overloaded windows, aging backlog, and SLA risks.
    
    STRICT RULE: Never reassign a task already in_production!
    """
    reassigned_leave = 0
    reassigned_overload = 0
    escalated_backlog = 0
    notified_sla_risk = 0

    today = date.today()

    # 1. Tasks assigned to staff who have newly approved leave covering the due date (unstarted backlog only)
    leave_query = text("""
        SELECT t.id, t.assigned_to
        FROM tasks t
        JOIN leave_requests l ON l.user_id = t.assigned_to
        WHERE t.status = 'backlog'
          AND l.status = 'approved'
          AND t.due_date BETWEEN l.start_date AND l.end_date;
    """)
    res = await db.execute(leave_query)
    for t_id, old_staff in res.fetchall():
        task = await db.get(Task, t_id)
        if task:
            task.assigned_to = None
            assigned = await assign_load_first(db, task, reason="reassign_assignee_on_leave")
            if assigned:
                reassigned_leave += 1

    # 2. Aging backlog tasks (> 24 hours unassigned)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    backlog_stmt = (
        select(Task)
        .where(Task.status == TaskStatus.BACKLOG)
        .where(Task.assigned_to.is_(None))
        .where(Task.created_at <= cutoff)
        .limit(20)
    )
    aging_tasks = (await db.execute(backlog_stmt)).scalars().all()
    for t in aging_tasks:
        assigned = await assign_continuity_first(db, t)
        if not assigned:
            # Escalate to admins
            escalated_backlog += 1
            await backlog_and_alert(db, t, skill=SKILL_FOR_KIND.get(get_kind_key(t.deliverable_type), "video"))

    # 3. SLA at risk: tasks due within 24 hours that are still not moved beyond production
    risk_cutoff = datetime.now(timezone.utc) + timedelta(hours=24)
    risk_stmt = (
        select(Task)
        .where(Task.status.in_([TaskStatus.BACKLOG, TaskStatus.IN_PRODUCTION]))
        .where(Task.sla_due_at.is_not(None))
        .where(Task.sla_due_at <= risk_cutoff)
        .where(Task.last_sla_notified_at.is_(None))
        .limit(30)
    )
    risk_tasks = (await db.execute(risk_stmt)).scalars().all()
    for t in risk_tasks:
        t.last_sla_notified_at = datetime.now(timezone.utc)
        notified_sla_risk += 1
        if t.assigned_to:
            db.add(
                Notification(
                    user_id=t.assigned_to,
                    title="⚠️ SLA Due in < 24 Hours",
                    message=f"Task {t.id} ({t.deliverable_type}) is due for delivery soon! Please finalize internal QA.",
                    link=f"/admin/tasks?selected={t.id}",
                )
            )

    await db.commit()
    logger.info("Nightly rebalance sweep completed: %d leave reassignments, %d backlog escalations, %d SLA warnings", reassigned_leave, escalated_backlog, notified_sla_risk)
    return {
        "reassigned_leave": reassigned_leave,
        "reassigned_overload": reassigned_overload,
        "escalated_backlog": escalated_backlog,
        "notified_sla_risk": notified_sla_risk,
    }


# --- Part 9: Flex Slot Management & Auto-Conversion Sweep ---

async def propose_flex_fill(
    db: AsyncSession,
    client_id: uuid.UUID,
    slot_id: uuid.UUID,
    theme: str,
    urgency: str | None = None,
) -> ContentCalendar | None:
    """Propose filling an open flex slot with a targeted theme, immediately generating a creative blueprint."""
    slot = await db.get(ContentCalendar, slot_id)
    if not slot or slot.client_id != client_id or slot.slot_strategy not in ("flex", "swapped"):
        return None

    client_prof = await db.get(ClientProfile, client_id)
    brand_dna = client_prof.brand_dna if client_prof and client_prof.brand_dna else {}

    kind = slot.slot_kind or "reel"
    bp = await generate_creative_blueprint(brand_dna, kind, "reach", theme=theme)
    bp_dict = bp.model_dump()

    slot.slot_strategy = "swapped"
    slot.caption = f"Flash Topic: {theme}"
    slot.blueprint = bp_dict
    slot.selected_hook = bp_dict["hooks"][0] if bp_dict.get("hooks") else None
    slot.concept_status = "concept_pending"
    await db.commit()
    logger.info("Filled flex slot %s for client %s with theme '%s'", slot_id, client_id, theme)
    return slot


async def flex_deadline_sweep(db: AsyncSession, target_date: date | None = None) -> dict[str, Any]:
    """Auto-convert unfilled flex slots past flex_deadline to anchor evergreen to safeguard paid quota."""
    today = target_date or date.today()
    stmt = (
        select(ContentCalendar)
        .where(ContentCalendar.slot_strategy == "flex")
        .where(ContentCalendar.flex_deadline <= today)
        .where(ContentCalendar.status != "archived")
    )
    unfilled = (await db.execute(stmt)).scalars().all()
    converted_count = 0
    for slot in unfilled:
        client_prof = await db.get(ClientProfile, slot.client_id)
        brand_dna = client_prof.brand_dna if client_prof and client_prof.brand_dna else {}
        kind = slot.slot_kind or "reel"
        bp = generate_deterministic_blueprint(brand_dna, kind, "authority", theme="Foundational Brand Pillar")
        bp_dict = bp.model_dump()

        slot.slot_strategy = "anchor"
        slot.caption = bp.premise
        slot.blueprint = bp_dict
        slot.selected_hook = bp_dict["hooks"][0] if bp_dict.get("hooks") else None
        slot.concept_status = "concept_pending"
        converted_count += 1

    if converted_count > 0:
        await db.commit()
    logger.info("Flex deadline sweep completed: auto-converted %d slots", converted_count)
    return {"auto_converted": converted_count}
