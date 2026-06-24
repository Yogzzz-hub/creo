from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import limiter
from core.security import RequireAdmin
from models.audit import QuestionnaireAuditLog
from models.deliverable import Deliverable
from models.enums import AccountStatus, UserRole
from models.plan import Plan
from models.questionnaire import Questionnaire
from models.subscription import Subscription
from models.ticket import Ticket
from models.enums import TicketStatus
from models.user import User
from schemas.admin import AdminClientDetailResponse, AdminClientListResponse, SubscriptionSnapshot
from schemas.questionnaire import AdminQuestionnaireOverride

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


class AdminQuestionnaireOverrideResponse(BaseModel):
    client_id: str
    ai_analysis: Optional[dict] = None
    ai_summary_line: Optional[str] = None
    overridden_by: str


@router.patch(
    "/clients/{client_id}/questionnaire-override",
    response_model=AdminQuestionnaireOverrideResponse,
)
async def override_questionnaire_analysis(
    client_id: str,
    payload: AdminQuestionnaireOverride,
    current_user: RequireAdmin,
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

    q_result = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == client_id)
    )
    questionnaire = q_result.scalar_one_or_none()

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questionnaire found for this client",
        )

    old_analysis = questionnaire.ai_analysis
    old_summary = questionnaire.ai_summary_line

    audit_log = QuestionnaireAuditLog(
        questionnaire_id=questionnaire.id,
        changed_by_user_id=current_user.id,
        change_source="admin_override",
        old_ai_analysis=old_analysis,
        new_ai_analysis=payload.ai_analysis,
        old_summary_line=old_summary,
        new_summary_line=payload.ai_summary_line,
    )
    db.add(audit_log)

    questionnaire.ai_analysis = payload.ai_analysis
    questionnaire.ai_summary_line = payload.ai_summary_line

    await db.commit()

    return AdminQuestionnaireOverrideResponse(
        client_id=client_id,
        ai_analysis=questionnaire.ai_analysis,
        ai_summary_line=questionnaire.ai_summary_line,
        overridden_by=current_user.id,
    )


class RegenerateAnalysisResponse(BaseModel):
    client_id: str
    status: str
    message: str
    requested_by: str


REGENERATION_COOLDOWN_MINUTES = 5


@router.post(
    "/clients/{client_id}/questionnaire-regenerate",
    response_model=RegenerateAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit("5/hour")
async def regenerate_questionnaire_analysis(
    request: Request,
    client_id: str,
    current_user: RequireAdmin,
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

    q_result = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == client_id)
    )
    questionnaire = q_result.scalar_one_or_none()

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questionnaire found for this client",
        )

    if questionnaire.updated_at is not None:
        cooldown_expiry = questionnaire.updated_at + timedelta(minutes=REGENERATION_COOLDOWN_MINUTES)
        if datetime.now(timezone.utc) < cooldown_expiry:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Cooldown active. Please wait {REGENERATION_COOLDOWN_MINUTES} minutes between regeneration requests.",
            )

    from workers.ai_tasks import generate_ai_analysis

    generate_ai_analysis.delay(client_id)

    return RegenerateAnalysisResponse(
        client_id=client_id,
        status="accepted",
        message="AI analysis regeneration dispatched. The client will be notified when complete.",
        requested_by=current_user.id,
    )
