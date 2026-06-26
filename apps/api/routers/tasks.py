from datetime import datetime, timezone
from typing import Annotated
import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamLead, RequireTeamMember
from models.deliverable import Deliverable
from models.enums import DeliverableStatus, TaskStatus
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.deliverable import DeliverableOut
from schemas.task import (
    ClientInfo,
    TaskAssignmentApproveRequest,
    TaskDetailResponse,
    TaskOut,
    TaskResponse,
    TaskStatusUpdate,
    TaskSubmitRequest,
)

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

VALID_TASK_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.pending: {TaskStatus.in_progress, TaskStatus.assignment_requested},
    TaskStatus.in_progress: {TaskStatus.submitted, TaskStatus.overdue},
    TaskStatus.submitted: {TaskStatus.approved, TaskStatus.revision},
    TaskStatus.revision: {TaskStatus.in_progress, TaskStatus.submitted},
    TaskStatus.assignment_requested: {TaskStatus.pending},
    TaskStatus.overdue: {TaskStatus.in_progress},
    TaskStatus.approved: set(),
}


def _validate_task_transition(current: TaskStatus, target: TaskStatus) -> None:
    allowed = VALID_TASK_TRANSITIONS.get(current, set())
    if target not in allowed:
        allowed_names = ", ".join(s.value for s in allowed) if allowed else "none (terminal state)"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition task from '{current.value}' to '{target.value}'. Allowed transitions: {allowed_names}",
        )


@router.get("", response_model=list[TaskResponse])
async def list_my_tasks(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        return []

    tasks_result = await db.execute(
        select(Task)
        .where(Task.assigned_to == team_member.id)
        .order_by(Task.priority.asc(), Task.due_date.asc().nullslast())
    )
    tasks = tasks_result.scalars().all()

    responses = []
    for task in tasks:
        client_result = await db.execute(
            select(User).where(User.id == task.client_id)
        )
        client = client_result.scalar_one_or_none()
        client_info = None
        if client:
            client_info = ClientInfo(
                id=client.id,
                full_name=client.full_name,
                business_name=client.business_name,
                plan_name=client.plan_name.value if client.plan_name else None,
            )
        responses.append(
            TaskResponse(
                id=task.id,
                client_id=task.client_id,
                client=client_info,
                assigned_to=task.assigned_to,
                assigned_by=task.assigned_by,
                deliverable_type=task.deliverable_type,
                status=task.status,
                priority=task.priority,
                is_addon=task.is_addon,
                assignment_date=task.assignment_date,
                due_date=task.due_date,
                submitted_at=task.submitted_at,
                created_at=task.created_at,
                updated_at=task.updated_at,
            )
        )

    return responses


@router.get("/pending", response_model=list[TaskOut])
async def list_pending_tasks(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    tasks_result = await db.execute(
        select(Task)
        .where(Task.assigned_to.is_(None))
        .order_by(Task.priority.asc(), Task.created_at.desc())
    )
    tasks = tasks_result.scalars().all()
    return tasks


@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task_detail(
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

    if task.assigned_to != team_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This task is not assigned to you",
        )

    client_result = await db.execute(
        select(User).where(User.id == task.client_id)
    )
    client = client_result.scalar_one_or_none()
    client_info = None
    if client:
        client_info = ClientInfo(
            id=client.id,
            full_name=client.full_name,
            business_name=client.business_name,
            plan_name=client.plan_name.value if client.plan_name else None,
        )

    ai_analysis_excerpt = None
    if client and client.questionnaire:
        if client.questionnaire.ai_summary_line:
            ai_analysis_excerpt = client.questionnaire.ai_summary_line
        elif client.questionnaire.ai_analysis:
            ai_text = json.dumps(client.questionnaire.ai_analysis, indent=2)
            ai_analysis_excerpt = ai_text[:500] if len(ai_text) > 500 else ai_text

    return TaskDetailResponse(
        id=task.id,
        client_id=task.client_id,
        client=client_info,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        deliverable_type=task.deliverable_type,
        status=task.status,
        priority=task.priority,
        is_addon=task.is_addon,
        assignment_date=task.assignment_date,
        due_date=task.due_date,
        submitted_at=task.submitted_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        content_brief=task.content_brief,
        ai_analysis_excerpt=ai_analysis_excerpt,
    )


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
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

    _validate_task_transition(task.status, payload.status)

    task.status = payload.status
    await db.commit()
    await db.refresh(task)

    client_result = await db.execute(
        select(User).where(User.id == task.client_id)
    )
    client = client_result.scalar_one_or_none()
    client_info = None
    if client:
        client_info = ClientInfo(
            id=client.id,
            full_name=client.full_name,
            business_name=client.business_name,
            plan_name=client.plan_name.value if client.plan_name else None,
        )

    return TaskResponse(
        id=task.id,
        client_id=task.client_id,
        client=client_info,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        deliverable_type=task.deliverable_type,
        status=task.status,
        priority=task.priority,
        is_addon=task.is_addon,
        assignment_date=task.assignment_date,
        due_date=task.due_date,
        submitted_at=task.submitted_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.post(
    "/{task_id}/request-assignment",
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
    task.requested_by = current_user.id
    task.status = TaskStatus.assignment_requested
    task.assignment_date = datetime.now(timezone.utc).date()

    await db.commit()
    await db.refresh(task)

    return {"task_id": task.id, "message": "Assignment requested successfully"}


@router.post(
    "/{task_id}/approve-assignment",
)
async def approve_task_assignment(
    task_id: str,
    payload: TaskAssignmentApproveRequest,
    current_user: RequireTeamLead,
    db: AsyncSession = Depends(get_db),
):
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if task.status != TaskStatus.assignment_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not have a pending assignment request",
        )

    task.assigned_to = payload.team_member_id
    task.assigned_by = current_user.id
    task.status = TaskStatus.pending
    task.requested_by = None

    await db.commit()
    await db.refresh(task)

    return {"task_id": task.id, "message": "Assignment approved successfully"}


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

    _validate_task_transition(task.status, TaskStatus.submitted)

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
