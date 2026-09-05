from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_client
from models.deliverable import Deliverable
from models.enums import DeliverableStatus, TicketStatus
from models.questionnaire import Questionnaire
from models.ticket import Ticket
from models.user import User
from models.announcement import Announcement
from schemas.portal import DashboardResponse, SubscriptionStatusResponse
from schemas.announcement import AnnouncementResponse

router = APIRouter(prefix="/api/v1/portal", tags=["portal-dashboard"])


def _compute_onboarding_stage(user: User) -> int:
    return user.onboarding_stage


@router.get("/dashboard", response_model=DashboardResponse)
async def get_portal_dashboard(
    current_user: Annotated[User, Depends(require_client)],
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
        select(Questionnaire.ai_summary_line, Questionnaire.submitted_at).where(
            Questionnaire.user_id == current_user.id
        )
    )
    questionnaire_row = questionnaire_result.one_or_none()
    ai_summary_line = questionnaire_row[0] if questionnaire_row else None
    questionnaire_submitted = questionnaire_row is not None and questionnaire_row[1] is not None

    return DashboardResponse(
        pending_deliverable_count=pending_deliverable_count,
        open_ticket_count=open_ticket_count,
        ai_summary_line=ai_summary_line,
        onboarding_stage=_compute_onboarding_stage(current_user),
        account_status=current_user.account_status.value,
        questionnaire_submitted=questionnaire_submitted,
        terms_accepted=current_user.terms_accepted,
        created_at=current_user.created_at,
    )


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: Annotated[User, Depends(require_client)],
):
    return SubscriptionStatusResponse(account_status=current_user.account_status)


@router.get("/announcements", response_model=list[AnnouncementResponse])
async def get_portal_announcements(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Announcement).where(
            Announcement.type.in_(["maintenance", "broadcast"])
        ).order_by(Announcement.created_at.desc())
    )
    announcements = result.scalars().all()

    return [
        AnnouncementResponse(
            id=a.id,
            author_id=a.author_id,
            title=a.title,
            content=a.content,
            type=a.type,
            target_departments=a.target_departments,
            created_at=a.created_at,
        )
        for a in announcements
    ]
