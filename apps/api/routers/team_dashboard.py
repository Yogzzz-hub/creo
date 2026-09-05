from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamMember
from models.enums import DeliverableType, LeaveStatus, TaskStatus
from models.leave import LeaveRequest
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.team_dashboard import DailyMetrics, TeamDashboardResponse

router = APIRouter(prefix="/api/v1/dashboard/team", tags=["team-dashboard"])


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
        return TeamDashboardResponse(
            daily_metrics=DailyMetrics(
                posters_completed=0,
                posters_cap=0,
                reels_completed=0,
                reels_cap=0,
                stories_completed=0,
                stories_cap=0,
            ),
            active_tasks_count=0,
            overdue_tasks_count=0,
            pending_leave_requests=False,
        )

    today = date.today()

    posters_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.assigned_to == team_member.id,
                Task.deliverable_type == DeliverableType.poster,
                func.date(Task.submitted_at) == today,
            )
        )
    )
    posters_completed = posters_result.scalar() or 0

    reels_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.assigned_to == team_member.id,
                Task.deliverable_type == DeliverableType.reel,
                func.date(Task.submitted_at) == today,
            )
        )
    )
    reels_completed = reels_result.scalar() or 0

    stories_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.assigned_to == team_member.id,
                Task.deliverable_type == DeliverableType.story,
                func.date(Task.submitted_at) == today,
            )
        )
    )
    stories_completed = stories_result.scalar() or 0

    daily_metrics = DailyMetrics(
        posters_completed=posters_completed,
        posters_cap=team_member.daily_cap_posters,
        reels_completed=reels_completed,
        reels_cap=team_member.daily_cap_reels,
        stories_completed=stories_completed,
        stories_cap=team_member.daily_cap_stories,
    )

    active_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.assigned_to == team_member.id,
                Task.status.in_([TaskStatus.pending, TaskStatus.in_progress, TaskStatus.revision]),
            )
        )
    )
    active_tasks_count = active_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.assigned_to == team_member.id,
                Task.status == TaskStatus.overdue,
            )
        )
    )
    overdue_tasks_count = overdue_result.scalar() or 0

    leave_result = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            and_(
                LeaveRequest.team_member_id == team_member.id,
                LeaveRequest.status == LeaveStatus.pending,
            )
        )
    )
    pending_leave_count = leave_result.scalar() or 0
    pending_leave_requests = pending_leave_count > 0

    return TeamDashboardResponse(
        daily_metrics=daily_metrics,
        active_tasks_count=active_tasks_count,
        overdue_tasks_count=overdue_tasks_count,
        pending_leave_requests=pending_leave_requests,
    )
