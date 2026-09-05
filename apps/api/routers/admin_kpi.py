from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.deliverable import Deliverable
from models.enums import DeliverableStatus, TaskStatus, UserRole
from models.plan import Plan
from models.subscription import Subscription
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.kpi import KPIDashboardResponse, TeamCapacityBar

router = APIRouter(prefix="/api/v1/admin", tags=["admin-kpi"])


@router.get("/kpi", response_model=KPIDashboardResponse)
async def get_kpi_dashboard(
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    approved_count_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.status == DeliverableStatus.approved,
            Deliverable.created_at >= thirty_days_ago,
        )
    )
    approved_count = approved_count_result.scalar() or 0

    total_submitted_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.created_at >= thirty_days_ago,
        )
    )
    total_submitted = total_submitted_result.scalar() or 0

    if total_submitted > 0:
        delivery_rate = (approved_count / total_submitted) * 100.0
    else:
        delivery_rate = 0.0

    active_tasks_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
        )
    )
    active_tasks_count = active_tasks_result.scalar() or 0

    team_members_result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.is_active.is_(True))
        .order_by(User.full_name.asc())
    )
    team_rows = team_members_result.all()

    active_member_ids = [tm.id for tm, _ in team_rows]

    load_counts_result = await db.execute(
        select(Task.assigned_to, func.count(Task.id).label("task_count"))
        .where(
            Task.assigned_to.in_(active_member_ids),
            Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
        )
        .group_by(Task.assigned_to)
    )
    load_map = {row.assigned_to: row.task_count for row in load_counts_result.all()}

    total_capacity = 0
    team_capacity_bars: list[TeamCapacityBar] = []

    for tm, user in team_rows:
        member_capacity = tm.daily_cap_posters + tm.daily_cap_reels + tm.daily_cap_stories
        total_capacity += member_capacity

        team_capacity_bars.append(
            TeamCapacityBar(
                team_member_name=user.full_name,
                current_load=load_map.get(tm.id, 0),
                max_capacity=member_capacity,
            )
        )

    if total_capacity > 0:
        active_capacity_pct = (active_tasks_count / total_capacity) * 100.0
    else:
        active_capacity_pct = 0.0

    total_revenue: float | None = None
    if current_user.role == UserRole.admin or current_user.role == UserRole.super_admin:
        revenue_result = await db.execute(
            select(func.coalesce(func.sum(Plan.monthly_price), 0.0))
            .join(Subscription, Subscription.plan_id == Plan.id)
            .join(User, User.id == Subscription.user_id)
            .where(
                Subscription.status == "active",
                User.role == UserRole.client,
                User.deleted_at.is_(None),
            )
        )
        total_revenue = float(revenue_result.scalar() or 0.0)

    return KPIDashboardResponse(
        delivery_rate_percentage=round(delivery_rate, 2),
        active_capacity_percentage=round(active_capacity_pct, 2),
        total_revenue=total_revenue,
        team_capacity_bars=team_capacity_bars,
    )
