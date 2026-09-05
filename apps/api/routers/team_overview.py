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

    active_member_ids = [tm.id for tm, _ in team_members]

    task_counts_result = await db.execute(
        select(
            Task.assigned_to,
            Task.status,
            func.count(Task.id).label("cnt"),
        )
        .where(Task.assigned_to.in_(active_member_ids))
        .group_by(Task.assigned_to, Task.status)
    )
    status_map: dict[str, dict[str, int]] = {}
    for row in task_counts_result.all():
        member_id = row.assigned_to
        if member_id not in status_map:
            status_map[member_id] = {}
        status_map[member_id][row.status.value] = row.cnt

    today_completed_result = await db.execute(
        select(Task.assigned_to, func.count(Task.id).label("cnt"))
        .where(
            Task.assigned_to.in_(active_member_ids),
            Task.status.in_([TaskStatus.submitted, TaskStatus.approved]),
            func.date(Task.submitted_at) == today,
        )
        .group_by(Task.assigned_to)
    )
    today_map = {row.assigned_to: row.cnt for row in today_completed_result.all()}

    members = []

    for team_member, user in team_members:
        tm_status = status_map.get(team_member.id, {})
        active_tasks = (
            tm_status.get(TaskStatus.pending.value, 0)
            + tm_status.get(TaskStatus.in_progress.value, 0)
        )
        overdue_tasks = tm_status.get(TaskStatus.overdue.value, 0)
        today_completed = today_map.get(team_member.id, 0)

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
