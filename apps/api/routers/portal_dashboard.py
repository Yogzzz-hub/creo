from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_active_client, require_client
from models.deliverable import Deliverable
from models.enums import DeliverableStatus, TicketStatus
from models.questionnaire import Questionnaire
from models.ticket import Ticket
from models.user import User
from schemas.portal import DashboardResponse, SubscriptionStatusResponse

router = APIRouter(prefix="/api/v1/portal", tags=["portal-dashboard"])


def _compute_onboarding_stage(user: User) -> int:
    if user.account_status.value in ("active", "lapsed", "suspended"):
        return 4
    if user.plan_name is not None:
        return 2
    return 1


@router.get("/dashboard", response_model=DashboardResponse)
async def get_portal_dashboard(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    pending_deliverable_result = await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.client_id == current_user.id,
            Deliverable.status == DeliverableStatus.pending_approval,
        )
    )
    pending_deliverable_count = pending_deliverable_result.scalar() or 0

    open_ticket_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.client_id == current_user.id,
            Ticket.status.notin_(
                [TicketStatus.resolved, TicketStatus.escalated]
            ),
        )
    )
    open_ticket_count = open_ticket_result.scalar() or 0

    questionnaire_result = await db.execute(
        select(Questionnaire.ai_summary_line).where(
            Questionnaire.user_id == current_user.id
        )
    )
    ai_summary_line = questionnaire_result.scalar_one_or_none()

    return DashboardResponse(
        pending_deliverable_count=pending_deliverable_count,
        open_ticket_count=open_ticket_count,
        ai_summary_line=ai_summary_line,
        onboarding_stage=_compute_onboarding_stage(current_user),
        account_status=current_user.account_status.value,
    )


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: Annotated[User, Depends(require_client)],
):
    return SubscriptionStatusResponse(account_status=current_user.account_status)
