from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import AccountStatus, UserRole
from models.escalation import Escalation
from models.leave import LeaveRequest
from models.enums import LeaveStatus
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.admin import AdminDashboardResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin-dashboard"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    active_clients_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.client,
            User.account_status == AccountStatus.active,
            User.deleted_at.is_(None),
        )
    )
    total_active_clients = active_clients_result.scalar() or 0

    mrr_result = await db.execute(
        select(func.coalesce(func.sum(Plan.monthly_price), 0.0))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .join(User, User.id == Subscription.user_id)
        .where(
            Subscription.status == "active",
            User.role == UserRole.client,
            User.deleted_at.is_(None),
        )
    )
    mrr_estimate = float(mrr_result.scalar() or 0.0)

    escalations_result = await db.execute(
        select(func.count(Escalation.id)).where(
            Escalation.status != "resolved",
        )
    )
    active_escalations = escalations_result.scalar() or 0

    leave_result = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.status == LeaveStatus.pending,
        )
    )
    pending_leave_requests = leave_result.scalar() or 0

    return AdminDashboardResponse(
        total_active_clients=total_active_clients,
        mrr_estimate=mrr_estimate,
        active_escalations=active_escalations,
        pending_leave_requests=pending_leave_requests,
    )
