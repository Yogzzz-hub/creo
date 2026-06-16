from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import RequireTeamMember
from models.deliverable import Deliverable
from models.enums import DeliverableStatus, TaskStatus
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.deliverable import DeliverableOut, TaskSubmitRequest
from schemas.task import TaskOut

from datetime import datetime, timezone
from typing import Annotated

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


class TaskListResponse(BaseModel):
    tasks: list[TaskOut]


class RequestAssignmentResponse(BaseModel):
    task: TaskOut
    message: str


@router.get("", response_model=TaskListResponse)
async def list_my_tasks(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        return TaskListResponse(tasks=[])

    tasks_result = await db.execute(
        select(Task)
        .where(Task.assigned_to == team_member.id)
        .order_by(Task.created_at.desc())
    )
    tasks = tasks_result.scalars().all()

    return TaskListResponse(tasks=tasks)


@router.get("/pending", response_model=TaskListResponse)
async def list_pending_tasks(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    tasks_result = await db.execute(
        select(Task)
        .where(Task.assigned_to.is_(None))
        .order_by(Task.priority.desc(), Task.created_at.desc())
    )
    tasks = tasks_result.scalars().all()

    return TaskListResponse(tasks=tasks)


@router.post(
    "/{task_id}/request-assignment",
    response_model=RequestAssignmentResponse,
)
async def request_task_assignment(
    task_id: str,
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a registered team member",
        )

    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if task.assigned_to is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already assigned",
        )

    task.assigned_to = team_member.id
    task.status = TaskStatus.in_progress
    task.assignment_date = datetime.now(timezone.utc).date()

    await db.commit()
    await db.refresh(task)

    return RequestAssignmentResponse(
        task=task,
        message="Task assigned successfully",
    )


@router.post(
    "/{task_id}/submit",
    response_model=DeliverableOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_task_deliverable(
    task_id: str,
    payload: TaskSubmitRequest,
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a registered team member",
        )

    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if task.assigned_to != team_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This task is not assigned to you",
        )

    revision_result = await db.execute(
        select(func.coalesce(func.max(Deliverable.revision_round), 0)).where(
            Deliverable.task_id == task_id
        )
    )
    max_revision = revision_result.scalar() or 0
    revision_round = max_revision + 1

    deliverable = Deliverable(
        task_id=task_id,
        client_id=task.client_id,
        submitted_by=team_member.id,
        file_url=payload.file_url,
        file_type=payload.file_type,
        file_size_bytes=payload.file_size_bytes,
        status=DeliverableStatus.pending_approval,
        revision_round=revision_round,
    )
    db.add(deliverable)

    task.status = TaskStatus.submitted
    task.submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(deliverable)

    return deliverable