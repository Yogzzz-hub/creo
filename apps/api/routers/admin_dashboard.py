from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.enums import AccountStatus, UserRole
from models.escalation import Escalation
from models.leave import LeaveRequest
from models.enums import LeaveStatus
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from models.notification import Notification
from models.content_calendar import ContentCalendar
from schemas.admin import AdminDashboardResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin-dashboard"])


class ActivityResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    created_at: str


class UpcomingContentResponse(BaseModel):
    id: str
    client_name: str
    content_type: str
    scheduled_date: str
    status: str


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    created_at: str


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


@router.get("/dashboard/activity", response_model=list[ActivityResponse])
async def get_dashboard_activity(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == _current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(10)
    )
    notifications = result.scalars().all()

    return [
        ActivityResponse(
            id=n.id,
            type=n.type if hasattr(n, 'type') else "system",
            title=n.title,
            description=n.message,
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in notifications
    ]


@router.get("/dashboard/upcoming", response_model=list[UpcomingContentResponse])
async def get_dashboard_upcoming(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentCalendar)
        .order_by(ContentCalendar.scheduled_date.asc())
        .limit(10)
    )
    entries = result.scalars().all()

    response = []
    for e in entries:
        client_result = await db.execute(select(User).where(User.id == e.client_id))
        client = client_result.scalar_one_or_none()

        response.append(UpcomingContentResponse(
            id=e.id,
            client_name=client.business_name or client.email if client else "Unknown",
            content_type=e.deliverable_type.value if hasattr(e.deliverable_type, 'value') else str(e.deliverable_type),
            scheduled_date=e.scheduled_date.isoformat() if e.scheduled_date else "",
            status=e.status.value if hasattr(e.status, 'value') else str(e.status),
        ))
    return response


@router.get("/dashboard/notifications", response_model=list[NotificationResponse])
async def get_dashboard_notifications(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == _current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    notifications = result.scalars().all()

    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type if hasattr(n, 'type') else "system",
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in notifications
    ]
