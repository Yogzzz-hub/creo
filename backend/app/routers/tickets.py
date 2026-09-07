"""Support ticketing router: client support tickets and threaded communications."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import TicketPriority, TicketStatus
from app.models.support import Ticket, TicketMessage

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class CreateTicketRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    priority: TicketPriority = TicketPriority.MEDIUM


class CreateTicketMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


@router.get("", response_model=list[dict[str, Any]])
async def list_tickets(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List tickets for the current client or all tickets for agency staff."""
    target_client_id = client_id or actor.client_id or actor.user_id

    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.messages))
        .where(Ticket.client_id == target_client_id)
        .order_by(Ticket.created_at.desc())
    )
    res = await db.execute(stmt)
    tickets = res.scalars().all()

    return [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "status": t.status.value,
            "priority": t.priority.value,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "message_count": len(t.messages),
        }
        for t in tickets
    ]


@router.post("", response_model=dict[str, Any], status_code=201)
async def create_ticket(
    payload: CreateTicketRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new support ticket."""
    client_id = actor.client_id or actor.user_id

    ticket = Ticket(
        client_id=client_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return {
        "id": str(ticket.id),
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "created_at": ticket.created_at.isoformat(),
    }


@router.get("/{ticket_id}", response_model=dict[str, Any])
async def get_ticket(
    ticket_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get ticket detail and threaded chat messages."""
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.messages))
        .where(Ticket.id == ticket_id)
    )
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "id": str(ticket.id),
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "created_at": ticket.created_at.isoformat(),
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in ticket.messages
        ],
    }


@router.post("/{ticket_id}/messages", response_model=dict[str, Any], status_code=201)
async def add_ticket_message(
    ticket_id: uuid.UUID,
    payload: CreateTicketMessageRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Add a message to a ticket conversation."""
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=actor.user_id,
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {
        "id": str(msg.id),
        "ticket_id": str(ticket.id),
        "sender_id": str(msg.sender_id),
        "message": msg.message,
        "created_at": msg.created_at.isoformat(),
    }
