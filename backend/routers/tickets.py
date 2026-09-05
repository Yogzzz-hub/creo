from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireClient
from models.client_assignment import ClientAssignment
from models.enums import Department, TicketStatus, TicketType
from models.team import TeamMember
from models.ticket import Ticket, TicketMessage
from models.user import User
from schemas.ticket import (
    TicketMessageCreate,
    TicketMessageOut,
    TicketOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/tickets",
    tags=["tickets"],
)

REOPEN_WINDOW_DAYS = 7


async def _find_assignment_target(
    db: AsyncSession,
    ticket_type: TicketType,
    client_id: str,
) -> str | None:

    if ticket_type == TicketType.deliverable_revision:
        # First, try to route to a specific team member
        # assigned to this client.
        result = await db.execute(
            select(TeamMember.user_id)
            .join(
                ClientAssignment,
                ClientAssignment.team_member_id == TeamMember.id,
            )
            .where(
                ClientAssignment.client_id == client_id,
                ClientAssignment.is_active == True,
                TeamMember.is_active == True,
            )
            .order_by(func.random())
            .limit(1)
        )

        assigned_user = result.scalar_one_or_none()

        if assigned_user:
            return assigned_user

        # Fallback to graphics department.
        target_department = Department.graphics

    elif ticket_type == TicketType.content_brief_update:
        target_department = Department.content_writing

    elif ticket_type == TicketType.calendar_request:
        target_department = Department.social_media

    elif ticket_type in (
        TicketType.general_support,
        TicketType.billing_issue,
    ):
        # Route directly to admin role.
        result = await db.execute(
            select(User.id)
            .where(
                User.role == "admin",
                User.deleted_at.is_(None),
            )
            .order_by(func.random())
            .limit(1)
        )

        return result.scalar_one_or_none()

    else:
        return None

    # Departmental routing.
    if target_department:
        result = await db.execute(
            select(TeamMember.user_id)
            .join(
                User,
                User.id == TeamMember.user_id,
            )
            .where(
                TeamMember.department == target_department,
                TeamMember.is_active == True,
                User.deleted_at.is_(None),
            )
            .order_by(func.random())
            .limit(1)
        )

        return result.scalar_one_or_none()

    return None


async def _generate_ticket_number(
    db: AsyncSession,
) -> str:

    result = await db.execute(
        select(Ticket.ticket_number).order_by(Ticket.ticket_number.desc()).limit(1)
    )

    last_ticket = result.scalar_one_or_none()
    if not last_ticket:
        return "TKT-0001"
        
    try:
        last_num = int(last_ticket.replace("TKT-", ""))
        return f"TKT-{last_num + 1:04d}"
    except (ValueError, AttributeError):
        # Fallback if malformed
        import uuid
        return f"TKT-{str(uuid.uuid4())[:8].upper()}"


@router.get(
    "",
    response_model=list[TicketOut],
)
async def list_tickets(
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket)
        .where(
            Ticket.client_id == current_user.id
        )
        .order_by(
            Ticket.created_at.desc()
        )
    )

    tickets = result.scalars().all()

    return tickets


@router.post(
    "",
    response_model=TicketOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket(
    current_user: RequireClient,
    ticket_type: str = Form(...),
    subject: str = Form(...),
    description: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    logger.info(
        "[create_ticket] user=%s ticket_type=%s subject=%s has_attachment=%s",
        current_user.id,
        ticket_type,
        subject,
        attachment is not None,
    )

    try:
        validated_type = TicketType(ticket_type)

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid ticket_type: {ticket_type}",
        )

    ticket_number = await _generate_ticket_number(db)

    assigned_to = await _find_assignment_target(
        db,
        validated_type,
        current_user.id,
    )

    ticket = Ticket(
        ticket_number=ticket_number,
        client_id=current_user.id,
        ticket_type=validated_type,
        subject=subject,
        description=description,
        status=TicketStatus.open,
        assigned_to=assigned_to,
    )

    db.add(ticket)

    try:
        await db.commit()
        await db.refresh(ticket)

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation.",
        )

    except Exception:
        await db.rollback()

        logger.exception(
            "Transaction failed during ticket creation"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed.",
        )

    return ticket


@router.get(
    "/{ticket_id}/messages",
    response_model=list[TicketMessageOut],
)
async def list_ticket_messages(
    ticket_id: str,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.client_id == current_user.id,
        )
    )

    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    messages_result = await db.execute(
        select(TicketMessage)
        .where(
            TicketMessage.ticket_id == ticket_id
        )
        .order_by(
            TicketMessage.created_at.asc()
        )
    )

    messages = messages_result.scalars().all()

    return messages


@router.post(
    "/{ticket_id}/messages",
    response_model=TicketMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket_message(
    ticket_id: str,
    payload: TicketMessageCreate,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.client_id == current_user.id,
        )
    )

    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message_text=payload.message_text,
        file_url=payload.file_url,
        file_name=payload.file_name,
        file_size_bytes=payload.file_size_bytes,
    )

    db.add(message)

    try:
        await db.commit()
        await db.refresh(message)

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation.",
        )

    except Exception:
        await db.rollback()

        logger.exception(
            "Transaction failed during ticket message creation"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed.",
        )

    return message


@router.post(
    "/{ticket_id}/resolve",
    response_model=TicketOut,
)
async def resolve_ticket(
    ticket_id: str,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.client_id == current_user.id,
        )
    )

    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if ticket.status == TicketStatus.resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is already resolved",
        )

    now = datetime.now(timezone.utc)

    ticket.status = TicketStatus.resolved
    ticket.resolved_at = now

    try:
        await db.commit()
        await db.refresh(ticket)

    except Exception:
        await db.rollback()

        logger.exception(
            "Transaction failed during ticket resolution"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed.",
        )

    return ticket


@router.post(
    "/{ticket_id}/reopen",
    response_model=TicketOut,
)
async def reopen_ticket(
    ticket_id: str,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.client_id == current_user.id,
        )
    )

    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if ticket.status != TicketStatus.resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only resolved tickets can be reopened",
        )

    if ticket.resolved_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Ticket has no resolution timestamp. "
                "Cannot reopen."
            ),
        )

    now = datetime.now(timezone.utc)

    elapsed = now - ticket.resolved_at

    if elapsed > timedelta(
        days=REOPEN_WINDOW_DAYS
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"The {REOPEN_WINDOW_DAYS}-day reopen window "
                f"has expired "
                f"(resolved {elapsed.days} days ago). "
                "Please create a new ticket."
            ),
        )

    ticket.status = TicketStatus.open
    ticket.reopened_at = now

    try:
        await db.commit()
        await db.refresh(ticket)

    except Exception:
        await db.rollback()

        logger.exception(
            "Transaction failed during ticket reopen"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed.",
        )

    return ticket