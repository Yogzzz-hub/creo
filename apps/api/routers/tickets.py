from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireClient
from models.enums import TicketStatus
from models.ticket import Ticket, TicketMessage
from models.user import User
from schemas.ticket import (
    TicketCreate,
    TicketMessageCreate,
    TicketMessageOut,
    TicketOut,
)

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])


async def _generate_ticket_number(db: AsyncSession) -> str:
    result = await db.execute(select(func.count(Ticket.id)))
    count = result.scalar() or 0
    return f"TKT-{count + 1:04d}"


@router.get("", response_model=list[TicketOut])
async def list_tickets(
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket)
        .where(Ticket.client_id == current_user.id)
        .order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return tickets


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    ticket_number = await _generate_ticket_number(db)
    ticket = Ticket(
        ticket_number=ticket_number,
        client_id=current_user.id,
        ticket_type=payload.ticket_type,
        subject=payload.subject,
        description=payload.description,
        status=TicketStatus.open,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}/messages", response_model=list[TicketMessageOut])
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
    await db.commit()
    await db.refresh(message)
    return message
