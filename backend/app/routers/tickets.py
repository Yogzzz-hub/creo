"""Support ticketing router: client support tickets and threaded communications."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import DeliverableType, TaskStatus, TicketPriority, TicketStatus, UserRole
from app.models.support import Ticket, TicketMessage
from app.models.work import Deliverable, Task

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class CreateTicketRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    priority: TicketPriority = TicketPriority.MEDIUM
    assigned_to: uuid.UUID | None = None
    deliverable_id: uuid.UUID | None = None


class CreateTicketMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)

class UpdateTicketStatusRequest(BaseModel):
    status: str


@router.get("", response_model=list[dict[str, Any]])
async def list_tickets(
    client_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query("active"),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = (
        select(Ticket)
        .options(
            selectinload(Ticket.messages),
            selectinload(Ticket.assignee),
            selectinload(Ticket.client),
            selectinload(Ticket.deliverable),
        )
        .order_by(Ticket.created_at.desc())
    )

    if actor.role in (UserRole.CLIENT, "client"):
        target_client_id = actor.client_id or actor.user_id
        stmt = stmt.where(Ticket.client_id == target_client_id, Ticket.status != TicketStatus.CLOSED)
    else:
        if client_id:
            stmt = stmt.where(Ticket.client_id == client_id)
        if status_filter == "active":
            stmt = stmt.where(Ticket.status != TicketStatus.CLOSED, Ticket.title != "Client Pod Thread")
        elif status_filter == "closed":
            stmt = stmt.where(Ticket.status == TicketStatus.CLOSED, Ticket.title != "Client Pod Thread")
        else:
            stmt = stmt.where(Ticket.title != "Client Pod Thread")

    res = await db.execute(stmt)
    tickets = res.scalars().all()

    def get_deliv_title(d: Any) -> str | None:
        if not d:
            return None
        ft = getattr(d, "file_type", "") or ""
        deliv_type = "Reel" if "video" in ft.lower() else "Deliverable"
        return f"{deliv_type} (v{d.version})"

    return [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "status": t.status.value,
            "priority": t.priority.value,
            "client": t.client.full_name if t.client else None,
            "client_email": t.client.email if t.client else None,
            "tier": "Active Retainer", # Could be dynamically fetched if tier exists on User/Client

            "created_at": t.created_at.isoformat() if t.created_at else None,
            "message_count": len(t.messages),
            "assigned_to": str(t.assigned_to) if t.assigned_to else None,
            "assignee": {
                "id": str(t.assignee.id),
                "full_name": t.assignee.full_name,
                "email": t.assignee.email,
                "role": t.assignee.role.value if hasattr(t.assignee.role, "value") else str(t.assignee.role),
            } if t.assignee else None,
            "deliverable_id": str(t.deliverable_id) if t.deliverable_id else None,
            "deliverable_title": get_deliv_title(t.deliverable),
            "deliverable_file_url": t.deliverable.file_url if t.deliverable else None,
            "deliverable_file_type": t.deliverable.file_type if t.deliverable else None,
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
        assigned_to=payload.assigned_to,
        deliverable_id=payload.deliverable_id,
    )
    db.add(ticket)

    # Automate task pipeline progression based on client request
    if payload.deliverable_id:
        deliv = await db.get(Deliverable, payload.deliverable_id)
        if deliv and deliv.task_id:
            deliv_task = await db.get(Task, deliv.task_id)
            if deliv_task:
                deliv_task.status = TaskStatus.IN_PRODUCTION
                deliv_task.is_revision = True
    else:
        # Client submitted a general creative request brief
        deliv_type = (
            DeliverableType.REEL
            if "reel" in payload.title.lower() or "video" in payload.title.lower()
            else DeliverableType.STATIC_POST
        )
        task = Task(
            client_id=client_id,
            deliverable_type=deliv_type,
            status=TaskStatus.IN_PRODUCTION if payload.assigned_to else TaskStatus.BACKLOG,
            assigned_to=payload.assigned_to,
        )
        db.add(task)

    await db.commit()
    await db.refresh(ticket)

    # Alert assigned specialist if specified
    if payload.assigned_to:
        from app.models.ops import Notification
        db.add(
            Notification(
                user_id=payload.assigned_to,
                title="🎫 New Support Request Assigned",
                message=f"New support ticket '{payload.title}' was assigned to you by client.",
                link="/admin/support",
                is_read=False,
            )
        )
        await db.commit()

    return {
        "id": str(ticket.id),
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "assigned_to": str(ticket.assigned_to) if ticket.assigned_to else None,
        "deliverable_id": str(ticket.deliverable_id) if ticket.deliverable_id else None,
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
        .options(
            selectinload(Ticket.messages).selectinload(TicketMessage.sender),
            selectinload(Ticket.assignee),
            selectinload(Ticket.deliverable),
        )
        .where(Ticket.id == ticket_id)
    )
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    client_id = actor.client_id or actor.user_id
    if actor.role in (UserRole.CLIENT, "client") and ticket.client_id != client_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this ticket")

    deliv_title = None
    if ticket.deliverable:
        ft = getattr(ticket.deliverable, "file_type", "") or ""
        dtype = "Reel" if "video" in ft.lower() else "Deliverable"
        deliv_title = f"{dtype} (v{ticket.deliverable.version})"

    return {
        "id": str(ticket.id),
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "created_at": ticket.created_at.isoformat(),
        "assigned_to": str(ticket.assigned_to) if ticket.assigned_to else None,
        "assignee": {
            "id": str(ticket.assignee.id),
            "full_name": ticket.assignee.full_name,
            "email": ticket.assignee.email,
            "role": ticket.assignee.role.value if hasattr(ticket.assignee.role, "value") else str(ticket.assignee.role),
        } if ticket.assignee else None,
        "deliverable_id": str(ticket.deliverable_id) if ticket.deliverable_id else None,
        "deliverable_title": deliv_title,
        "deliverable_file_url": ticket.deliverable.file_url if ticket.deliverable else None,
        "deliverable_file_type": ticket.deliverable.file_type if ticket.deliverable else None,
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "sender_name": m.sender.full_name or m.sender.email if m.sender else None,
                "sender_role": m.sender.role.value if m.sender and hasattr(m.sender.role, "value") else (str(m.sender.role) if m.sender else None),
                "sender_email": m.sender.email if m.sender else None,
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in sorted(ticket.messages, key=lambda x: x.created_at)
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

    client_id = actor.client_id or actor.user_id
    if actor.role in (UserRole.CLIENT, "client") and ticket.client_id != client_id:
        raise HTTPException(status_code=403, detail="Not authorized to reply to this ticket")

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=actor.user_id,
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    if actor.role not in (UserRole.CLIENT, "client"):
        from app.models.ops import Notification
        from app.models.auth import User
        user = await db.get(User, actor.user_id)
        sender_name = user.full_name if user else "Support"
        notif = Notification(
            user_id=ticket.client_id,
            title=f"New reply on ticket #{str(ticket.id)[:4].upper()}",
            message=f"{sender_name}: {payload.message[:80]}...",
            link=f"/portal/support/{ticket.id}",
            is_read=False,
        )
        db.add(notif)
        await db.commit()

    return {
        "id": str(msg.id),
        "ticket_id": str(ticket.id),
        "sender_id": str(msg.sender_id),
        "message": msg.message,
        "created_at": msg.created_at.isoformat(),
    }


@router.patch("/{ticket_id}/status", response_model=dict[str, Any])
async def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: UpdateTicketStatusRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from datetime import datetime, timezone
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.title == "Client Pod Thread":
        raise HTTPException(
            status_code=400, 
            detail="Continuous pod chat thread cannot be closed or resolved."
        )

    if actor.role in (UserRole.CLIENT, "client"):
        raise HTTPException(status_code=403, detail="Clients cannot resolve or close tickets.")

    new_status = payload.status.upper()
    if new_status == "RESOLVED":
        ticket.status = TicketStatus.RESOLVED
        ticket.resolved_at = datetime.now(timezone.utc)
        from app.models.ops import Notification
        notif = Notification(
            user_id=ticket.client_id,
            title=f"Ticket #{str(ticket.id)[:4].upper()} Resolved",
            message="Your Pod Lead has marked this issue as resolved.",
            link=f"/portal/support/{ticket.id}"
        )
        db.add(notif)
    elif new_status == "CLOSED":
        ticket.status = TicketStatus.CLOSED
        ticket.closed_at = datetime.now(timezone.utc)
    elif new_status == "OPEN":
        ticket.status = TicketStatus.OPEN

    await db.commit()
    return {"message": "Status updated successfully", "status": ticket.status.value}
