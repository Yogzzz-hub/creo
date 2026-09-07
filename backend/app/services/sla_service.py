"""SLA calculation and automated breach monitoring service.

Computes turnaround deadlines at task creation based on plan tier and deliverable kind.
Idempotently sweeps for breached tasks, updates notifications, and logs audit entries.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import DeliverableType, TaskStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.user import User
from app.models.work import Task

logger = logging.getLogger(__name__)

# SLA target turnaround hours by plan tier
SLA_HOURS_MAP: dict[str, dict[DeliverableType, int]] = {
    "starter": {
        DeliverableType.REEL: 48,
        DeliverableType.CAROUSEL: 48,
        DeliverableType.STORY: 24,
        DeliverableType.STATIC_POST: 24,
        DeliverableType.SHOOT_DAY: 72,
    },
    "growth": {
        DeliverableType.REEL: 36,
        DeliverableType.CAROUSEL: 36,
        DeliverableType.STORY: 18,
        DeliverableType.STATIC_POST: 18,
        DeliverableType.SHOOT_DAY: 48,
    },
    "scale": {
        DeliverableType.REEL: 24,
        DeliverableType.CAROUSEL: 24,
        DeliverableType.STORY: 12,
        DeliverableType.STATIC_POST: 12,
        DeliverableType.SHOOT_DAY: 24,
    },
}


def compute_sla_due_at(
    plan_tier: str | None,
    deliverable_type: DeliverableType,
    base_time: datetime | None = None,
) -> datetime:
    """Compute SLA target timestamp from plan tier and deliverable kind."""
    now = base_time or datetime.now(UTC)
    tier_key = (plan_tier or "starter").lower()
    if tier_key not in SLA_HOURS_MAP:
        tier_key = "starter"

    tier_slas = SLA_HOURS_MAP[tier_key]
    hours = tier_slas.get(deliverable_type, 48)
    return now + timedelta(hours=hours)


async def breach_sweep(db: AsyncSession) -> list[Task]:
    """Find all unnotified tasks past sla_due_at that are not terminal.

    Writes audit_log row, notifies the assignee and team lead.
    Guaranteed idempotent via last_sla_notified_at tracking.
    """
    now = datetime.now(UTC)
    stmt = select(Task).where(
        Task.status.not_in([TaskStatus.READY_TO_PUBLISH, TaskStatus.COMPLETED]),
        Task.sla_due_at.is_not(None),
        Task.sla_due_at < now,
        Task.last_sla_notified_at.is_(None),
    )

    result = await db.execute(stmt)
    breached_tasks = list(result.scalars().all())
    if not breached_tasks:
        return []

    # Find team leads for escalation
    leads_res = await db.execute(
        select(User.id).where(
            User.role.in_([UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN])
        )
    )
    lead_ids = leads_res.scalars().all()

    for task in breached_tasks:
        task.last_sla_notified_at = now

        # Write audit log row in the same transaction
        audit = AuditLog(
            actor_id=None,
            actor_role=None,
            entity="task",
            entity_id=task.id,
            action="sla_breached",
            to_value={
                "sla_due_at": task.sla_due_at.isoformat() if task.sla_due_at else None,
                "breached_at": now.isoformat(),
                "status": task.status.value,
                "assigned_to": str(task.assigned_to) if task.assigned_to else None,
            },
        )
        db.add(audit)

        # Notify assignee if assigned
        if task.assigned_to:
            notif_assignee = Notification(
                user_id=task.assigned_to,
                title="SLA Breached",
                message=(
                    f"Task {task.id} ({task.deliverable_type.value}) has breached "
                    "its turnaround SLA."
                ),
                link=f"/kanban?task={task.id}",
            )
            db.add(notif_assignee)

        # Notify team leads
        for lead_id in lead_ids[:2]:
            notif_lead = Notification(
                user_id=lead_id,
                title="SLA Breach Escalation",
                message=(
                    f"Task {task.id} ({task.deliverable_type.value}) breached SLA "
                    f"(due: {task.sla_due_at})."
                ),
                link=f"/kanban?task={task.id}",
            )
            db.add(notif_lead)

    await db.commit()
    logger.warning("Processed %d SLA breaches", len(breached_tasks))
    return breached_tasks
