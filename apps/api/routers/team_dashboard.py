from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamMember
from models.enums import TaskStatus
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.task import TaskOut

router = APIRouter(prefix="/api/v1/dashboard/team", tags=["team-dashboard"])


class TeamDashboardResponse(BaseModel):
    today_tasks: list[TaskOut]
    completed_count: int
    pending_count: int


@router.get("", response_model=TeamDashboardResponse)
async def get_team_dashboard(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        return TeamDashboardResponse(today_tasks=[], completed_count=0, pending_count=0)

    today = date.today()

    tasks_result = await db.execute(
        select(Task).where(
            Task.assigned_to == team_member.id,
            Task.due_date == today,
        )
    )
    today_tasks = tasks_result.scalars().all()

    completed_count_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.assigned_to == team_member.id,
            Task.status == TaskStatus.approved,
        )
    )
    completed_count = completed_count_result.scalar() or 0

    pending_count_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.assigned_to == team_member.id,
            Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
        )
    )
    pending_count = pending_count_result.scalar() or 0

    return TeamDashboardResponse(
        today_tasks=today_tasks,
        completed_count=completed_count,
        pending_count=pending_count,
    )