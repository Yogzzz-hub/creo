from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.deliverable import Deliverable
from models.enums import AccountStatus, UserRole
from models.plan import Plan
from models.subscription import Subscription
from models.ticket import Ticket
from models.enums import TicketStatus
from models.user import User
from schemas.admin import AdminClientDetailResponse, AdminClientListResponse, SubscriptionSnapshot

router = APIRouter(prefix="/api/v1/admin", tags=["admin-clients"])


@router.get("/clients", response_model=list[AdminClientListResponse])
async def list_clients(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(default=None, description="Search by business name or email"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by account status"),
):
    query = select(User).where(
        User.role == UserRole.client,
        User.deleted_at.is_(None),
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (User.business_name.ilike(search_pattern)) | (User.email.ilike(search_pattern))
        )

    if status_filter:
        try:
            account_status = AccountStatus(status_filter)
            query = query.where(User.account_status == account_status)
        except ValueError:
            pass

    query = query.order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        AdminClientListResponse(
            user_id=u.id,
            business_name=u.business_name,
            email=u.email,
            plan_name=u.plan_name.value if u.plan_name else None,
            status=u.account_status.value,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.get("/clients/{client_id}", response_model=AdminClientDetailResponse)
async def get_client_detail(
    client_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(
        select(User).where(
            User.id == client_id,
            User.role == UserRole.client,
            User.deleted_at.is_(None),
        )
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    subscriptions_result = await db.execute(
        select(Subscription, Plan.name, Plan.monthly_price)
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.user_id == client_id)
        .order_by(Subscription.created_at.desc())
    )
    subscription_rows = subscriptions_result.all()

    subscriptions = [
        SubscriptionSnapshot(
            id=sub.id,
            plan_id=sub.plan_id,
            plan_name=plan_name.value if plan_name else None,
            status=sub.status,
            monthly_price=float(monthly_price) if monthly_price else None,
            gateway=sub.gateway.value,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
        )
        for sub, plan_name, monthly_price in subscription_rows
    ]

    deliverables_count_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.client_id == client_id,
        )
    )
    deliverables_count = deliverables_count_result.scalar() or 0

    open_tickets_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.client_id == client_id,
            Ticket.status.in_([TicketStatus.open, TicketStatus.in_progress, TicketStatus.escalated]),
        )
    )
    open_tickets_count = open_tickets_result.scalar() or 0

    return AdminClientDetailResponse(
        user_id=user.id,
        full_name=user.full_name,
        business_name=user.business_name,
        email=user.email,
        phone=user.phone,
        plan_name=user.plan_name.value if user.plan_name else None,
        status=user.account_status.value,
        created_at=user.created_at,
        subscriptions=subscriptions,
        deliverables_count=deliverables_count,
        open_tickets_count=open_tickets_count,
    )
