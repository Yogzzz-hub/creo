from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.ticket import Ticket, TicketMessage
from models.user import User
from models.enums import TicketStatus

router = APIRouter(prefix="/api/v1/admin/support", tags=["admin-support"])


class AdminTicketResponse(BaseModel):
    id: str
    subject: str
    ticket_type: str
    status: str
    client_name: str
    client_id: str
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    message_count: int
    created_at: str
    updated_at: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str


class TicketAssign(BaseModel):
    assigned_to: Optional[str] = None


class TicketMessageCreate(BaseModel):
    message_text: Optional[str] = None


class TicketMessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message_text: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: str


@router.get("/tickets", response_model=list[AdminTicketResponse])
async def list_admin_tickets(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()

    response = []
    for t in tickets:
        client_result = await db.execute(select(User).where(User.id == t.client_id))
        client = client_result.scalar_one_or_none()

        assigned_name = None
        if t.assigned_to:
            assignee_result = await db.execute(select(User).where(User.id == t.assigned_to))
            assignee = assignee_result.scalar_one_or_none()
            if assignee:
                assigned_name = getattr(assignee, 'full_name', None) or assignee.email

        msg_count_result = await db.execute(
            select(func.count(TicketMessage.id)).where(TicketMessage.ticket_id == t.id)
        )
        msg_count = msg_count_result.scalar() or 0

        response.append(AdminTicketResponse(
            id=t.id,
            subject=t.subject,
            ticket_type=t.ticket_type.value if hasattr(t.ticket_type, 'value') else str(t.ticket_type),
            status=t.status.value if hasattr(t.status, 'value') else str(t.status),
            client_name=client.business_name or client.email if client else "Unknown",
            client_id=t.client_id,
            assigned_to=t.assigned_to,
            assigned_name=assigned_name,
            message_count=msg_count,
            created_at=t.created_at.isoformat() if t.created_at else "",
            updated_at=t.updated_at.isoformat() if t.updated_at else None,
        ))
    return response


@router.get("/tickets/{ticket_id}")
async def get_admin_ticket(
    ticket_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    client_result = await db.execute(select(User).where(User.id == ticket.client_id))
    client = client_result.scalar_one_or_none()

    assigned_name = None
    if ticket.assigned_to:
        assignee_result = await db.execute(select(User).where(User.id == ticket.assigned_to))
        assignee = assignee_result.scalar_one_or_none()
        if assignee:
            assigned_name = getattr(assignee, 'full_name', None) or assignee.email

    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "ticket_type": ticket.ticket_type.value if hasattr(ticket.ticket_type, 'value') else str(ticket.ticket_type),
        "status": ticket.status.value if hasattr(ticket.status, 'value') else str(ticket.status),
        "client_name": client.business_name or client.email if client else "Unknown",
        "client_id": ticket.client_id,
        "assigned_to": ticket.assigned_to,
        "assigned_name": assigned_name,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else "",
    }


@router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        ticket.status = TicketStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    await db.commit()
    return {"status": "updated"}


@router.patch("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    payload: TicketAssign,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.assigned_to = payload.assigned_to or None
    await db.commit()
    return {"status": "assigned"}


@router.get("/tickets/{ticket_id}/messages", response_model=list[TicketMessageResponse])
async def list_ticket_messages(
    ticket_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
    )
    messages = result.scalars().all()

    response = []
    for msg in messages:
        sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
        sender = sender_result.scalar_one_or_none()
        sender_name = "Unknown"
        sender_role = "unknown"
        if sender:
            sender_name = getattr(sender, 'full_name', None) or sender.email
            sender_role = sender.role.value if hasattr(sender.role, 'value') else str(sender.role)

        response.append(TicketMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            sender_role=sender_role,
            message_text=msg.message_text,
            file_url=msg.file_url,
            file_name=msg.file_name,
            created_at=msg.created_at.isoformat() if msg.created_at else "",
        ))
    return response


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket_message(
    ticket_id: str,
    payload: TicketMessageCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message_text=payload.message_text,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    return TicketMessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=getattr(current_user, 'full_name', None) or current_user.email,
        sender_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        message_text=message.message_text,
        file_url=message.file_url,
        file_name=message.file_name,
        created_at=message.created_at.isoformat() if message.created_at else "",
    )
