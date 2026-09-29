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
    """Dispatch a task to the lowest-load eligible staff member using the unified dispatch engine.

    If nobody is eligible, leaves task in backlog and notifies team lead.
    """
    from app.services.dispatch_engine import assign_continuity_first, assign_load_first, get_task_effort_points

    task = await db.get(Task, task_id)
    if not task:
        return None

    if not task.effort_points:
        task.effort_points = get_task_effort_points(task.deliverable_type, task.is_revision)

    if required_skill_override:
        return await assign_load_first(
            db,
            task,
            reason="skill_override_dispatch",
            required_skill_override=required_skill_override,
            actor_id=actor_id,
        )

    return await assign_continuity_first(db, task, actor_id=actor_id)


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
