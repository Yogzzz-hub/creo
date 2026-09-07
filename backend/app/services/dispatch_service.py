"""Workload-aware task dispatcher service.

Implements the ranked-eligibility CTE:
- Filters staff_profiles where is_accepting_work is True.
- Excludes staff currently on approved leave today.
- Ensures current WIP < daily_capacity.
- Matches required skill for deliverable type.
- Orders by load ratio (wip / daily_capacity), tie-broken randomly.
- Enforces FOR UPDATE on the staff profile row to prevent over-allocation.
- Leaves task in backlog and notifies team lead if nobody is eligible.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import DeliverableType, TaskStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.user import StaffProfile, User
from app.models.work import Task

logger = logging.getLogger(__name__)

# Deliverable type to primary skill mapping
SKILL_MAP: dict[DeliverableType, str] = {
    DeliverableType.REEL: "video",
    DeliverableType.CAROUSEL: "graphics",
    DeliverableType.STORY: "graphics",
    DeliverableType.STATIC_POST: "graphics",
    DeliverableType.SHOOT_DAY: "video",
}


async def find_eligible_assignee(
    db: AsyncSession,
    deliverable_type: DeliverableType,
    required_skill_override: str | None = None,
) -> uuid.UUID | None:
    """Find the best eligible staff member using the ranked-eligibility CTE under FOR UPDATE."""
    skill = required_skill_override or SKILL_MAP.get(deliverable_type, "video")
    deliv_type_str = (
        deliverable_type.value if hasattr(deliverable_type, "value") else str(deliverable_type)
    )

    query = text("""
        WITH load AS (
            SELECT sp.user_id, sp.daily_capacity, sp.skills,
                   COUNT(t.id) FILTER (WHERE t.status IN ('in_production', 'internal_qa')) AS wip
            FROM staff_profiles sp
            LEFT JOIN tasks t ON t.assigned_to = sp.user_id
            WHERE sp.is_accepting_work = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM leave_requests l
                  WHERE l.user_id = sp.user_id
                    AND l.status = 'approved'
                    AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
              )
            GROUP BY sp.user_id, sp.daily_capacity, sp.skills
        )
        SELECT user_id, daily_capacity, wip
        FROM load
        WHERE ((:has_override = TRUE AND :required_skill = ANY(skills))
            OR (:has_override = FALSE AND (:required_skill = ANY(skills) OR :deliv_type = ANY(skills))))
          AND wip < daily_capacity
        ORDER BY (wip::float / daily_capacity), random()
        LIMIT 5;
    """)

    result = await db.execute(
        query,
        {
            "has_override": required_skill_override is not None,
            "required_skill": skill,
            "deliv_type": deliv_type_str,
        },
    )
    candidate_rows = result.fetchall()
    if not candidate_rows:
        return None

    # Concurrency lock: lock the chosen staff profile and re-verify WIP within transaction
    for row in candidate_rows:
        cand_id = row[0]
        # Acquire lock on staff profile row
        lock_res = await db.execute(
            select(StaffProfile.user_id, StaffProfile.daily_capacity)
            .where(StaffProfile.user_id == cand_id)
            .with_for_update()
        )
        staff_row = lock_res.fetchone()
        if not staff_row:
            continue

        cap = staff_row[1]

        # Re-verify active WIP count under lock
        wip_res = await db.execute(
            text("""
                SELECT COUNT(id) FROM tasks
                WHERE assigned_to = :cand_id
                  AND status IN ('in_production', 'internal_qa')
            """),
            {"cand_id": cand_id},
        )
        current_wip = wip_res.scalar() or 0
        if current_wip < cap:
            return uuid.UUID(str(cand_id))

    return None


async def dispatch_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID | None = None,
    actor_role: UserRole | None = None,
    required_skill_override: str | None = None,
) -> uuid.UUID | None:
    """Dispatch a task to the lowest-load eligible staff member.

    If nobody is eligible, leaves task in backlog and notifies team lead.
    """
    task = await db.get(Task, task_id)
    if not task:
        return None

    assignee_id = await find_eligible_assignee(
        db,
        deliverable_type=task.deliverable_type,
        required_skill_override=required_skill_override,
    )

    if assignee_id:
        prev_status = task.status
        prev_assignee = task.assigned_to
        task.assigned_to = assignee_id
        task.status = TaskStatus.IN_PRODUCTION

        audit = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            entity="task",
            entity_id=task.id,
            action="task_dispatched",
            from_value={
                "status": (
                    prev_status.value if hasattr(prev_status, "value") else str(prev_status)
                ),
                "assigned_to": str(prev_assignee) if prev_assignee else None,
            },
            to_value={"status": TaskStatus.IN_PRODUCTION.value, "assigned_to": str(assignee_id)},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(task)
        logger.info("Task %s dispatched to %s", task.id, assignee_id)
        return assignee_id

    # Fallback: Nobody is eligible
    task.status = TaskStatus.BACKLOG
    audit = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        entity="task",
        entity_id=task.id,
        action="dispatch_failed",
        to_value={"reason": "NO_ELIGIBLE_STAFF", "status": TaskStatus.BACKLOG.value},
    )
    db.add(audit)

    # Notify team lead and admin
    leads_res = await db.execute(
        select(User.id)
        .where(User.role.in_([UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
        .order_by(User.created_at.desc())
    )
    lead_ids = leads_res.scalars().all()
    for lead_id in lead_ids[:3]:
        notif = Notification(
            user_id=lead_id,
            title="Dispatch backlog: No eligible staff",
            message=(
                f"Task {task.id} ({task.deliverable_type.value}) could not be assigned: "
                "no creative capacity available."
            ),
            link=f"/kanban?task={task.id}",
        )
        db.add(notif)

    await db.commit()
    logger.warning("Task %s could not be dispatched: no eligible staff", task.id)
    return None


async def dispatch_next(
    db: AsyncSession,
    actor_id: uuid.UUID | None = None,
    actor_role: UserRole | None = None,
    deliverable_type: DeliverableType | None = None,
) -> Task | None:
    """Acquire and dispatch the next pending task from backlog using FOR UPDATE SKIP LOCKED."""
    stmt = (
        select(Task.id)
        .where(Task.status == TaskStatus.BACKLOG, Task.assigned_to.is_(None))
        .order_by(Task.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if deliverable_type is not None:
        stmt = stmt.where(Task.deliverable_type == deliverable_type)

    res = await db.execute(stmt)
    task_id = res.scalar_one_or_none()
    if not task_id:
        return None

    assigned = await dispatch_task(db, task_id, actor_id=actor_id, actor_role=actor_role)
    if assigned:
        return await db.get(Task, task_id)
    return None
