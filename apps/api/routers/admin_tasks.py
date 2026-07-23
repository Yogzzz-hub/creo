from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.task import Task
from models.user import User
from models.team import TeamMember
from models.enums import TaskStatus

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


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    client_name: Optional[str] = None
    priority: str = "medium"
    deadline: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str


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
            member_result = await db.execute(
                select(TeamMember).where(TeamMember.id == t.assigned_to)
            )
            member = member_result.scalar_one_or_none()
            if member:
                assigned_name = member.full_name

        client_name = None
        if t.client_id:
            client_result = await db.execute(select(User).where(User.id == t.client_id))
            client = client_result.scalar_one_or_none()
            if client:
                client_name = client.business_name or client.email

        status_val = t.status.value if hasattr(t.status, 'value') else str(t.status)
        if status_val == "overdue" or (t.due_date and str(t.due_date) < str(func.now())):
            status_val = "overdue"

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
        member_result = await db.execute(
            select(TeamMember).where(TeamMember.id == payload.assigned_to)
        )
        member = member_result.scalar_one_or_none()
        if member:
            assigned_name = member.full_name

    return AdminTaskResponse(
        id=task.id,
        title=payload.title,
        description=payload.description,
        status="todo",
        priority=payload.priority,
        assigned_to=task.assigned_to,
        assigned_name=assigned_name,
        client_name=payload.client_name,
        deadline=deadline.isoformat() if deadline else None,
        created_at=task.created_at.isoformat() if task.created_at else "",
        updated_at=None,
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
