from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import Department, DeliverableType, TaskStatus
from models.task import Task
from models.task_history import TaskStatusHistory
from models.team import TeamMember
from models.user import User
from services.task_dispatcher import MAP_DELIVERABLE_TO_DEPARTMENT

router = APIRouter(prefix="/api/v1/admin", tags=["admin-tasks"])


class AdminTaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    client_name: Optional[str] = None
    deadline: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    deliverable_type: str
    department: str


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    client_name: Optional[str] = None
    priority: str = "medium"
    deadline: Optional[str] = None
    deliverable_type: DeliverableType = DeliverableType.poster


class TaskStatusUpdate(BaseModel):
    status: str


class TaskReassignRequest(BaseModel):
    team_member_id: Optional[str] = None


PRIORITY_MAP = {"low": 1, "medium": 2, "high": 3, "urgent": 4}
PRIORITY_REVERSE = {v: k for k, v in PRIORITY_MAP.items()}


@router.get("/tasks", response_model=list[AdminTaskResponse])
async def list_admin_tasks(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()

    response = []
    for t in tasks:
        assigned_name = None
        if t.assigned_to:
            user_result = await db.execute(
                select(User).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.id == t.assigned_to)
            )
            assigned_user = user_result.scalar_one_or_none()
            if assigned_user:
                assigned_name = assigned_user.full_name

        client_name = None
        if t.client_id:
            client_result = await db.execute(select(User).where(User.id == t.client_id))
            client = client_result.scalar_one_or_none()
            if client:
                client_name = client.business_name or client.email

        status_val = t.status.value if hasattr(t.status, 'value') else str(t.status)
        if status_val == "overdue" or (t.due_date and str(t.due_date) < str(func.now())):
            status_val = "overdue"

        dept = MAP_DELIVERABLE_TO_DEPARTMENT.get(t.deliverable_type, Department.graphics)

        response.append(AdminTaskResponse(
            id=t.id,
            title=t.content_brief or f"Task {t.id[:8]}",
            description=t.content_brief,
            status=status_val,
            priority=PRIORITY_REVERSE.get(t.priority, "medium"),
            assigned_to=t.assigned_to,
            assigned_name=assigned_name,
            client_name=client_name,
            deadline=t.due_date.isoformat() if t.due_date else None,
            created_at=t.created_at.isoformat() if t.created_at else "",
            updated_at=t.updated_at.isoformat() if t.updated_at else None,
            deliverable_type=t.deliverable_type.value,
            department=dept.value,
        ))
    return response


@router.post("/tasks", response_model=AdminTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_task(
    payload: TaskCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as date_type
    deadline = None
    if payload.deadline:
        try:
            deadline = date_type.fromisoformat(payload.deadline)
        except ValueError:
            pass

    task = Task(
        client_id=current_user.id,
        assigned_to=payload.assigned_to,
        assigned_by=current_user.id,
        deliverable_type=payload.deliverable_type,
        content_brief=payload.title,
        status=TaskStatus.pending,
        priority=PRIORITY_MAP.get(payload.priority, 2),
        due_date=deadline,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    assigned_name = None
    if payload.assigned_to:
        user_result = await db.execute(
            select(User).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.id == payload.assigned_to)
        )
        assigned_user = user_result.scalar_one_or_none()
        if assigned_user:
            assigned_name = assigned_user.full_name

    dept = MAP_DELIVERABLE_TO_DEPARTMENT.get(task.deliverable_type, Department.graphics)

    return AdminTaskResponse(
        id=task.id,
        title=payload.title,
        description=payload.description,
        status=task.status.value,
        priority=payload.priority,
        assigned_to=task.assigned_to,
        assigned_name=assigned_name,
        client_name=payload.client_name,
        deadline=deadline.isoformat() if deadline else None,
        created_at=task.created_at.isoformat() if task.created_at else "",
        updated_at=None,
        deliverable_type=task.deliverable_type.value,
        department=dept.value,
    )


@router.patch("/tasks/{task_id}/status")
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    status_map = {
        "todo": TaskStatus.pending,
        "in_progress": TaskStatus.in_progress,
        "review": TaskStatus.submitted,
        "done": TaskStatus.approved,
    }
    new_status = status_map.get(payload.status)
    if new_status:
        task.status = new_status
    await db.commit()
    return {"status": "updated"}


@router.patch("/tasks/{task_id}/reassign", response_model=AdminTaskResponse)
async def reassign_task(
    task_id: str,
    payload: TaskReassignRequest,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_assigned_to = task.assigned_to

    if payload.team_member_id:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.id == payload.team_member_id,
                TeamMember.is_active == True
            )
        )
        member = member_result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found or inactive")

        task.assigned_to = member.id
        task.assignment_date = datetime.now(timezone.utc).date()
        task.requested_by = None
    else:
        task.assigned_to = None
        task.assignment_date = None

    # Add audit log note to task description/brief
    reassign_log = f"\n[Manually Reassigned by Admin to {payload.team_member_id if payload.team_member_id else 'Unassigned'}]"
    if task.content_brief:
        task.content_brief += reassign_log
    else:
        task.content_brief = reassign_log

    # Log task status history
    history = TaskStatusHistory(
        task_id=task.id,
        changed_by_user_id=current_user.id,
        old_status=task.status.value if hasattr(task.status, 'value') else str(task.status),
        new_status=task.status.value if hasattr(task.status, 'value') else str(task.status),
    )
    db.add(history)
    await db.commit()

    assigned_name = None
    if task.assigned_to:
        user_result = await db.execute(
            select(User).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.id == task.assigned_to)
        )
        assigned_user = user_result.scalar_one_or_none()
        if assigned_user:
            assigned_name = assigned_user.full_name

    client_name = None
    if task.client_id:
        client_result = await db.execute(select(User).where(User.id == task.client_id))
        client = client_result.scalar_one_or_none()
        if client:
            client_name = client.business_name or client.email

    dept = MAP_DELIVERABLE_TO_DEPARTMENT.get(task.deliverable_type, Department.graphics)

    return AdminTaskResponse(
        id=task.id,
        title=task.content_brief or f"Task {task.id[:8]}",
        description=task.content_brief,
        status=task.status.value if hasattr(task.status, 'value') else str(task.status),
        priority=PRIORITY_REVERSE.get(task.priority, "medium"),
        assigned_to=task.assigned_to,
        assigned_name=assigned_name,
        client_name=client_name,
        deadline=task.due_date.isoformat() if task.due_date else None,
        created_at=task.created_at.isoformat() if task.created_at else "",
        updated_at=task.updated_at.isoformat() if task.updated_at else None,
        deliverable_type=task.deliverable_type.value,
        department=dept.value,
    )
