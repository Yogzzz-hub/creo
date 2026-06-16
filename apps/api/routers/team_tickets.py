from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamMember
from models.enums import TicketStatus
from models.ticket import Ticket, TicketMessage
from models.user import User
from schemas.ticket import TicketMessageCreate, TicketMessageOut, TicketOut

router = APIRouter(prefix="/api/v1/team/tickets", tags=["team-tickets"])


@router.get("", response_model=list[TicketOut])
async def list_assigned_tickets(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket)
        .where(Ticket.assigned_to == current_user.id)
        .order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return tickets


@router.get("/{ticket_id}/messages", response_model=list[TicketMessageOut])
async def list_ticket_messages(
    ticket_id: str,
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.assigned_to == current_user.id,
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
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
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
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.assigned_to == current_user.id,
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
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message
