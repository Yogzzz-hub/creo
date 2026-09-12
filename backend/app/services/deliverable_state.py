r"""Deliverable state machine — the ONLY place deliverable.status is ever assigned.

Architecture rule: No other file in the codebase may assign `deliverable.status`.
grep: grep -rn 'deliverable\.status\s*=' app/ --include='*.py' | grep -v deliverable_state

State graph (12 statuses, 14 legal edges):
  draft → in_production, archived
  in_production → pending_qa, archived
  pending_qa → qa_rejected, pending_approval
  qa_rejected → in_production
  pending_approval → revision_requested, approved
  revision_requested → in_production
  approved → scheduled, published, archived
  scheduled → publishing, approved, archived
  publishing → published, publish_failed
  publish_failed → scheduled, archived
  published → archived
  archived → (terminal)
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden
from app.models.billing import Subscription
from app.models.enums import DeliverableStatus, DeliverableType, SubscriptionStatus, TaskStatus, UserRole
from app.models.ops import AuditLog
from app.models.work import Deliverable, Task

# ── State transition graph ────────────────────────────────────────────────────
# Key: current status. Value: set of allowed target statuses.
TRANSITIONS: dict[str, set[str]] = {
    DeliverableStatus.DRAFT: {
        DeliverableStatus.IN_PRODUCTION,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.IN_PRODUCTION: {
        DeliverableStatus.PENDING_QA,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.PENDING_QA: {
        DeliverableStatus.QA_REJECTED,
        DeliverableStatus.PENDING_APPROVAL,
    },
    DeliverableStatus.QA_REJECTED: {
        DeliverableStatus.IN_PRODUCTION,
    },
    DeliverableStatus.PENDING_APPROVAL: {
        DeliverableStatus.REVISION_REQUESTED,
        DeliverableStatus.APPROVED,
    },
    DeliverableStatus.REVISION_REQUESTED: {
        DeliverableStatus.IN_PRODUCTION,
        DeliverableStatus.PENDING_QA,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.APPROVED: {
        DeliverableStatus.SCHEDULED,
        DeliverableStatus.PUBLISHED,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.SCHEDULED: {
        DeliverableStatus.PUBLISHING,
        DeliverableStatus.APPROVED,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.PUBLISHING: {
        DeliverableStatus.PUBLISHED,
        DeliverableStatus.PUBLISH_FAILED,
    },
    DeliverableStatus.PUBLISH_FAILED: {
        DeliverableStatus.SCHEDULED,
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.PUBLISHED: {
        DeliverableStatus.ARCHIVED,
    },
    DeliverableStatus.ARCHIVED: set(),  # terminal
}

# ── Actor role permissions per transition edge ───────────────────────────────
# Key: (from_status, to_status). Value: set of allowed roles.
# Edges absent from this map are open to any authenticated staff/admin actor.
_STAFF_ROLES = {
    UserRole.EDITOR,
    UserRole.DESIGNER,
    UserRole.TEAM_LEAD,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
}
_LEAD_PLUS = {UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN}
_CLIENT_OR_ADMIN = {UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN}
_SYSTEM = {UserRole.ADMIN, UserRole.SUPER_ADMIN}

ALLOWED_ACTORS: dict[tuple[str, str], set[UserRole]] = {
    # Staff submits to QA
    (DeliverableStatus.IN_PRODUCTION, DeliverableStatus.PENDING_QA): _STAFF_ROLES,
    # Team lead QA approve/reject
    (DeliverableStatus.PENDING_QA, DeliverableStatus.PENDING_APPROVAL): _LEAD_PLUS,
    (DeliverableStatus.PENDING_QA, DeliverableStatus.QA_REJECTED): _LEAD_PLUS,
    # Staff reworks after QA reject
    (DeliverableStatus.QA_REJECTED, DeliverableStatus.IN_PRODUCTION): _STAFF_ROLES,
    # Client decision
    (DeliverableStatus.PENDING_APPROVAL, DeliverableStatus.APPROVED): _CLIENT_OR_ADMIN,
    (DeliverableStatus.PENDING_APPROVAL, DeliverableStatus.REVISION_REQUESTED): _CLIENT_OR_ADMIN,
    # Staff picks back up revision
    (DeliverableStatus.REVISION_REQUESTED, DeliverableStatus.IN_PRODUCTION): _STAFF_ROLES,
    (DeliverableStatus.REVISION_REQUESTED, DeliverableStatus.PENDING_QA): _STAFF_ROLES,
    (DeliverableStatus.REVISION_REQUESTED, DeliverableStatus.ARCHIVED): _STAFF_ROLES,
    # Schedule / publish (system/staff)
    (DeliverableStatus.APPROVED, DeliverableStatus.SCHEDULED): _STAFF_ROLES,
    (DeliverableStatus.APPROVED, DeliverableStatus.PUBLISHED): _SYSTEM,
    (DeliverableStatus.APPROVED, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
    (DeliverableStatus.SCHEDULED, DeliverableStatus.PUBLISHING): _SYSTEM,
    (DeliverableStatus.SCHEDULED, DeliverableStatus.APPROVED): _LEAD_PLUS,
    (DeliverableStatus.SCHEDULED, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
    (DeliverableStatus.PUBLISHING, DeliverableStatus.PUBLISHED): _SYSTEM,
    (DeliverableStatus.PUBLISHING, DeliverableStatus.PUBLISH_FAILED): _SYSTEM,
    (DeliverableStatus.PUBLISH_FAILED, DeliverableStatus.SCHEDULED): _STAFF_ROLES,
    (DeliverableStatus.PUBLISH_FAILED, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
    (DeliverableStatus.PUBLISHED, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
    # Draft → in_production (anyone on staff)
    (DeliverableStatus.DRAFT, DeliverableStatus.IN_PRODUCTION): _STAFF_ROLES,
    (DeliverableStatus.DRAFT, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
    (DeliverableStatus.IN_PRODUCTION, DeliverableStatus.ARCHIVED): _LEAD_PLUS,
}


async def transition(
    db: AsyncSession,
    deliverable: Deliverable,
    to_status: DeliverableStatus,
    *,
    actor_id: uuid.UUID | None = None,
    actor_role: UserRole = UserRole.SUPER_ADMIN,
    reason: str | None = None,
    scheduled_at: datetime | None = None,
    qa_notes: str | None = None,
    request_id: str | None = None,
) -> Deliverable:
    """Execute a status transition on a deliverable.

    This is the ONLY function that may write deliverable.status. No other
    module is permitted to assign deliverable.status directly.

    Raises:
        Conflict: illegal edge or revision limit reached
        Forbidden: actor role not permitted for this edge
    """
    current = DeliverableStatus(deliverable.status)
    from_str = current.value
    to_str = to_status.value

    # 1. Validate the edge is legal
    allowed_targets = TRANSITIONS.get(from_str, set())
    if to_str not in allowed_targets:
        raise Conflict(
            f"Transition '{from_str}' → '{to_str}' is not a valid transition",
            code="INVALID_STATE_TRANSITION",
            details={"from": from_str, "to": to_str, "allowed": list(allowed_targets)},
        )

    # 2. Validate the actor role is permitted for this specific edge
    edge_allowed_roles = ALLOWED_ACTORS.get((from_str, to_str))
    if edge_allowed_roles and actor_role not in edge_allowed_roles:
        raise Forbidden(
            f"Role '{actor_role.value}' is not authorized to transition from "
            f"'{from_str}' to '{to_str}'",
            code="TRANSITION_FORBIDDEN",
            details={
                "role": actor_role.value,
                "from": from_str,
                "to": to_str,
                "allowed_roles": [r.value for r in edge_allowed_roles],
            },
        )

    now = datetime.now(UTC)

    # 3. Revision limit check — only path that checks the plan quota
    if to_str == DeliverableStatus.REVISION_REQUESTED:
        sub_stmt = (
            select(Subscription)
            .where(
                Subscription.client_id == deliverable.client_id,
                Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub_res = await db.execute(sub_stmt)
        sub = sub_res.scalar_one_or_none()

        from app.models.billing import Plan  # local import avoids circular

        max_rounds = 1  # safe default
        if sub and sub.plan_id:
            plan_res = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
            plan = plan_res.scalar_one_or_none()
            if plan:
                max_rounds = plan.revision_rounds

        current_round = deliverable.revision_round or 0
        if current_round >= max_rounds:
            raise Conflict(
                f"This plan includes {max_rounds} revision round(s). "
                "Upgrade your plan or approve the deliverable as-is.",
                code="REVISION_LIMIT_REACHED",
                details={
                    "max_rounds": max_rounds,
                    "current_round": current_round,
                    "plan_revision_rounds": max_rounds,
                },
            )
        # Increment round BEFORE committing — only on success
        deliverable.revision_round = current_round + 1
        if reason:
            deliverable.rejection_comment = reason

    # 4. Apply the transition — the ONLY assignment in the codebase
    deliverable.status = to_status  # direct assignment guarded by this function

    # 5. Stamp timestamps
    if to_str == DeliverableStatus.APPROVED:
        deliverable.approved_at = now
    elif to_str == DeliverableStatus.SCHEDULED:
        if scheduled_at is None:
            raise Conflict(
                "scheduled_at is required for the 'scheduled' transition",
                code="MISSING_SCHEDULED_AT",
            )
        deliverable.scheduled_at = scheduled_at
    elif to_str in (DeliverableStatus.QA_REJECTED, DeliverableStatus.REVISION_REQUESTED):
        deliverable.rejected_at = now
        if qa_notes:
            deliverable.rejection_comment = qa_notes
        elif reason and to_str == DeliverableStatus.REVISION_REQUESTED:
            deliverable.rejection_comment = reason

    # 6. Automate Kanban Task Status synchronization
    try:
        await sync_task_with_deliverable(db, deliverable, to_status)
    except Exception as err:
        import structlog
        structlog.get_logger(__name__).warning("failed_to_sync_task_with_deliverable", deliverable_id=str(deliverable.id), error=str(err))

    # 7. Write audit log in the SAME transaction
    audit_extra: dict[str, Any] = {"reason": reason}
    if qa_notes:
        audit_extra["qa_notes"] = qa_notes
    if scheduled_at:
        audit_extra["scheduled_at"] = scheduled_at.isoformat()

    audit = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        entity="deliverable",
        entity_id=deliverable.id,
        action="status_change",
        from_value={"status": from_str},
        to_value={"status": to_str, **audit_extra},
        request_id=request_id,
        created_at=now,
    )
    db.add(audit)

    # Commit with audit log in the same transaction
    await db.commit()
    await db.refresh(deliverable)
    return deliverable


async def sync_task_with_deliverable(
    db: AsyncSession,
    deliverable: Deliverable,
    to_status: DeliverableStatus,
) -> Task | None:
    """Automate Kanban task progression based on deliverable lifecycle events."""
    task = None
    if deliverable.task_id:
        task = await db.get(Task, deliverable.task_id)

    if not task:
        stmt = (
            select(Task)
            .where(Task.client_id == deliverable.client_id)
            .order_by(Task.updated_at.desc())
            .limit(1)
        )
        task = (await db.execute(stmt)).scalar_one_or_none()
        if task:
            deliverable.task_id = task.id

    if not task:
        deliv_type = (
            DeliverableType.REEL
            if ("reel" in (deliverable.file_type or "").lower() or "video" in (deliverable.file_type or "").lower())
            else DeliverableType.STATIC_POST
        )
        task = Task(
            client_id=deliverable.client_id,
            deliverable_type=deliv_type,
            status=TaskStatus.BACKLOG,
            assigned_to=deliverable.submitted_by,
        )
        db.add(task)
        await db.flush()
        deliverable.task_id = task.id

    to_str = to_status.value if hasattr(to_status, "value") else str(to_status)

    if to_str == DeliverableStatus.DRAFT.value:
        task.status = TaskStatus.BACKLOG
    elif to_str in (DeliverableStatus.IN_PRODUCTION.value, DeliverableStatus.QA_REJECTED.value):
        task.status = TaskStatus.IN_PRODUCTION
    elif to_str == DeliverableStatus.PENDING_QA.value:
        task.status = TaskStatus.INTERNAL_QA
    elif to_str == DeliverableStatus.PENDING_APPROVAL.value:
        task.status = TaskStatus.CLIENT_REVIEW
    elif to_str in (DeliverableStatus.APPROVED.value, DeliverableStatus.SCHEDULED.value, DeliverableStatus.PUBLISHED.value):
        task.status = TaskStatus.READY_TO_PUBLISH
    elif to_str == DeliverableStatus.REVISION_REQUESTED.value:
        task.status = TaskStatus.IN_PRODUCTION
        task.is_revision = True

    return task
