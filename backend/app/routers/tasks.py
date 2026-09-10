"""Tasks and Kanban API router.

Provides:
- GET /tasks/kanban: Grouped by status in ONE query using json_agg per column.
- POST /tasks: Create task with automated SLA calculation.
- POST /tasks/{id}/assign: Auto-dispatch or assign to specific creative.
- POST /tasks/{id}/reassign: Reassign with audit log.
- PATCH /tasks/{id}/move: Drag-and-drop kanban state mutation with role check and audit log.
- POST /tasks/bulk-assign: Bulk task assignment.
- POST /tasks/sweep-slas: Trigger SLA breach sweep.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import (
    Actor,
    StaffActor,
    TeamLeadActor,
)
from app.db.session import get_db
from app.models.billing import Plan, Subscription
from app.models.enums import DeliverableStatus, DeliverableType, SubscriptionStatus, TaskStatus, UserRole
from app.models.ops import AuditLog
from app.models.user import User
from app.models.work import Deliverable, Task
from app.services.dispatch_service import dispatch_task
from app.services.sla_service import breach_sweep, compute_sla_due_at

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks & Kanban"])


# --- Schemas ---


class TaskCreateRequest(BaseModel):
    client_id: uuid.UUID
    deliverable_type: DeliverableType
    due_date: date | None = None
    auto_dispatch: bool = False


class TaskAssignRequest(BaseModel):
    assignee_id: uuid.UUID | None = None


class TaskReassignRequest(BaseModel):
    new_assignee_id: uuid.UUID


class TaskMoveRequest(BaseModel):
    to_status: TaskStatus


class BulkAssignRequest(BaseModel):
    task_ids: list[uuid.UUID]
    assignee_id: uuid.UUID | None = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    assigned_to: uuid.UUID | None
    deliverable_type: DeliverableType
    status: TaskStatus
    due_date: date | None
    sla_due_at: datetime | None
    last_sla_notified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    assignee_name: str | None = None
    assignee_email: str | None = None
    client_company: str | None = None

    model_config = {"from_attributes": True}


class KanbanBoardResponse(BaseModel):
    backlog: list[dict[str, Any]]
    in_production: list[dict[str, Any]]
    internal_qa: list[dict[str, Any]]
    client_review: list[dict[str, Any]]
    ready_to_publish: list[dict[str, Any]]


# --- Routes ---


@router.get("/kanban", response_model=KanbanBoardResponse)
async def get_kanban_board(
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> KanbanBoardResponse:
    """Return kanban columns in ONE database query using json_agg per column."""
    sql = text("""
        SELECT
            COALESCE(
                json_agg(t.*) FILTER (WHERE t.status = 'backlog'), '[]'::json
            ) AS backlog,
            COALESCE(
                json_agg(t.*) FILTER (WHERE t.status = 'in_production'), '[]'::json
            ) AS in_production,
            COALESCE(
                json_agg(t.*) FILTER (WHERE t.status = 'internal_qa'), '[]'::json
            ) AS internal_qa,
            COALESCE(
                json_agg(t.*) FILTER (WHERE t.status = 'client_review'), '[]'::json
            ) AS client_review,
            COALESCE(
                json_agg(t.*) FILTER (WHERE t.status = 'ready_to_publish'), '[]'::json
            ) AS ready_to_publish
        FROM (
            SELECT
                t.id,
                t.client_id,
                t.assigned_to,
                t.deliverable_type,
                t.status,
                t.due_date,
                t.sla_due_at,
                t.last_sla_notified_at,
                t.created_at,
                t.updated_at,
                u.email AS assignee_email,
                u.full_name AS assignee_name,
                c.email AS client_email,
                cp.company_name AS client_company
            FROM tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            LEFT JOIN users c ON c.id = t.client_id
            LEFT JOIN client_profiles cp ON cp.user_id = t.client_id
            ORDER BY t.created_at DESC
        ) t;
    """)

    result = await db.execute(sql)
    row = result.fetchone()

    def parse_col(val: Any) -> list[dict[str, Any]]:
        if not val:
            return []
        if isinstance(val, str):
            parsed = json.loads(val)
            return list(parsed) if isinstance(parsed, list) else []
        return list(val)

    if not row:
        return KanbanBoardResponse(
            backlog=[],
            in_production=[],
            internal_qa=[],
            client_review=[],
            ready_to_publish=[],
        )

    return KanbanBoardResponse(
        backlog=parse_col(row[0]),
        in_production=parse_col(row[1]),
        internal_qa=parse_col(row[2]),
        client_review=parse_col(row[3]),
        ready_to_publish=parse_col(row[4]),
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> TaskResponse:
    """Create a new task with automated SLA due computation."""
    # Lookup client plan tier to compute turnaround SLA
    sub_res = await db.execute(
        select(Plan.name)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(
            Subscription.client_id == payload.client_id,
            Subscription.status.in_([SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE]),
        )
    )
    plan_name = sub_res.scalar_one_or_none()

    sla_due = compute_sla_due_at(plan_name, payload.deliverable_type)

    task = Task(
        client_id=payload.client_id,
        deliverable_type=payload.deliverable_type,
        status=TaskStatus.BACKLOG,
        due_date=payload.due_date,
        sla_due_at=sla_due,
    )
    db.add(task)
    await db.flush()

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="task",
        entity_id=task.id,
        action="task_created",
        to_value={
            "client_id": str(payload.client_id),
            "deliverable_type": payload.deliverable_type.value,
            "sla_due_at": sla_due.isoformat(),
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)

    if payload.auto_dispatch:
        await dispatch_task(db, task.id, actor_id=actor.user_id, actor_role=actor.role)
        await db.refresh(task)

    return TaskResponse.model_validate(task)


@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    task_id: uuid.UUID,
    payload: TaskAssignRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> TaskResponse:
    """Assign task to a specific creative or trigger workload-aware auto-dispatch."""
    task = await db.get(Task, task_id)
    if not task:
        raise NotFound(f"Task {task_id} not found", code="TASK_NOT_FOUND")

    if payload.assignee_id is None:
        # Auto dispatch
        await dispatch_task(db, task_id, actor_id=actor.user_id, actor_role=actor.role)
        await db.refresh(task)
        return TaskResponse.model_validate(task)

    # Manual assignment
    user = await db.get(User, payload.assignee_id)
    if not user:
        raise NotFound(f"User {payload.assignee_id} not found", code="USER_NOT_FOUND")

    prev_assignee = task.assigned_to
    task.assigned_to = payload.assignee_id
    if task.status == TaskStatus.BACKLOG:
        task.status = TaskStatus.IN_PRODUCTION

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="task",
        entity_id=task.id,
        action="task_assigned",
        from_value={"assigned_to": str(prev_assignee) if prev_assignee else None},
        to_value={"assigned_to": str(payload.assignee_id), "status": task.status.value},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/reassign", response_model=TaskResponse)
async def reassign_task(
    task_id: uuid.UUID,
    payload: TaskReassignRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> TaskResponse:
    """Reassign task to a different creative with audit logging."""
    task = await db.get(Task, task_id)
    if not task:
        raise NotFound(f"Task {task_id} not found", code="TASK_NOT_FOUND")

    new_user = await db.get(User, payload.new_assignee_id)
    if not new_user:
        raise NotFound(f"User {payload.new_assignee_id} not found", code="USER_NOT_FOUND")

    prev_assignee = task.assigned_to
    task.assigned_to = payload.new_assignee_id

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="task",
        entity_id=task.id,
        action="task_reassigned",
        from_value={"assigned_to": str(prev_assignee) if prev_assignee else None},
        to_value={"assigned_to": str(payload.new_assignee_id)},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    task_id: uuid.UUID,
    payload: TaskMoveRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = StaffActor,
) -> TaskResponse:
    """Move task across kanban stages with role verification and audit log."""
    task = await db.get(Task, task_id)
    if not task:
        raise NotFound(f"Task {task_id} not found", code="TASK_NOT_FOUND")

    # Permission check: creatives cannot move straight to ready_to_publish without QA
    if payload.to_status == TaskStatus.READY_TO_PUBLISH:
        if actor.role in [UserRole.EDITOR, UserRole.DESIGNER]:
            raise Forbidden(
                "Creatives cannot move tasks directly to ready_to_publish; team lead QA required",
                code="UNAUTHORIZED_MOVE",
            )
        # Verify linked deliverables do not have unresolved rejections
        deliv_res = await db.execute(
            select(Deliverable).where(Deliverable.task_id == task_id)
        )
        delivs = deliv_res.scalars().all()
        for d in delivs:
            if d.status in [DeliverableStatus.QA_REJECTED, DeliverableStatus.REVISION_REQUESTED]:
                raise Conflict(
                    f"Cannot move task to ready_to_publish: deliverable {d.id} has unresolved status ({d.status.value})",
                    code="DELIVERABLE_NOT_APPROVED",
                )

    prev_status = task.status
    task.status = payload.to_status

    audit = AuditLog(
        actor_id=actor.user_id,
        actor_role=actor.role,
        entity="task",
        entity_id=task.id,
        action="task_moved",
        from_value={"status": prev_status.value},
        to_value={"status": payload.to_status.value},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/bulk-assign")
async def bulk_assign_tasks(
    payload: BulkAssignRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Bulk assign or dispatch a list of tasks."""
    assigned_count = 0
    for tid in payload.task_ids:
        if payload.assignee_id:
            task = await db.get(Task, tid)
            if task:
                task.assigned_to = payload.assignee_id
                if task.status == TaskStatus.BACKLOG:
                    task.status = TaskStatus.IN_PRODUCTION
                db.add(
                    AuditLog(
                        actor_id=actor.user_id,
                        actor_role=actor.role,
                        entity="task",
                        entity_id=task.id,
                        action="task_bulk_assigned",
                        to_value={"assigned_to": str(payload.assignee_id)},
                    )
                )
                assigned_count += 1
        else:
            res = await dispatch_task(db, tid, actor_id=actor.user_id, actor_role=actor.role)
            if res:
                assigned_count += 1

    await db.commit()
    return {
        "status": "ok",
        "assigned_count": assigned_count,
        "total_requested": len(payload.task_ids),
    }


@router.post("/sweep-slas")
async def trigger_sla_sweep(
    db: AsyncSession = Depends(get_db),
    actor: Actor = TeamLeadActor,
) -> dict[str, Any]:
    """Manually trigger idempotent SLA breach sweep."""
    breaches = await breach_sweep(db)
    return {"status": "ok", "breaches_detected": len(breaches)}
