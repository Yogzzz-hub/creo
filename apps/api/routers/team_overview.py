from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamLead
from models.enums import UserRole
from models.task import Task, TaskStatus
from models.team import TeamMember
from models.user import User
from schemas.team_overview import MemberMetrics, TeamOverviewResponse

router = APIRouter(prefix="/api/v1/team", tags=["team-overview"])


@router.get("/overview", response_model=TeamOverviewResponse)
async def get_team_overview(
    current_user: RequireTeamLead,
    db: AsyncSession = Depends(get_db),
):
    team_members_result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(User.role.in_([UserRole.team_member, UserRole.team_lead]))
        .order_by(User.full_name.asc())
    )
    team_members = team_members_result.all()

    today = date.today()
    members = []

    for team_member, user in team_members:
        active_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assigned_to == team_member.id,
                Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
            )
        )
        active_tasks = active_result.scalar() or 0

        overdue_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assigned_to == team_member.id,
                Task.status == TaskStatus.overdue,
            )
        )
        overdue_tasks = overdue_result.scalar() or 0

        today_completed_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assigned_to == team_member.id,
                Task.status == TaskStatus.submitted,
                func.date(Task.submitted_at) == today,
            )
        )
        today_completed = today_completed_result.scalar() or 0

        members.append(
            MemberMetrics(
                team_member_id=team_member.id,
                name=user.full_name,
                role=user.role.value,
                active_tasks=active_tasks,
                overdue_tasks=overdue_tasks,
                today_completed=today_completed,
                daily_cap_posters=team_member.daily_cap_posters,
                daily_cap_reels=team_member.daily_cap_reels,
                daily_cap_stories=team_member.daily_cap_stories,
            )
        )

    return TeamOverviewResponse(members=members)
