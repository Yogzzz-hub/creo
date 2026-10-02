"""Chat router: Direct messaging and pod channel communication."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.chat import DirectMessage
from app.models.ops import Notification
from app.models.enums import UserRole, TicketStatus, TicketPriority
from app.models.user import User
from app.models.support import Ticket, TicketMessage

router = APIRouter(prefix="/chat", tags=["Chat"])


class SendMessageRequest(BaseModel):
    recipient_id: uuid.UUID | None = None
    channel: str | None = None
    client_id: uuid.UUID | None = None
    message: str = Field(..., min_length=1)
    thread_type: str = "direct"


@router.get("/messages", response_model=list[dict[str, Any]])
async def get_messages(
    other_user_id: uuid.UUID | None = None,
    channel: str | None = None,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> list[dict[str, Any]]:
    """Fetch 1-on-1 or channel chat history."""
    if not other_user_id and not channel:
        return []

    if channel:
        stmt = (
            select(DirectMessage)
            .where(DirectMessage.thread_type == channel)
            .order_by(DirectMessage.created_at.asc())
            .limit(100)
        )
    else:
        current_user_id = actor.user_id
        stmt = (
            select(DirectMessage)
            .where(
                or_(
                    and_(
                        DirectMessage.sender_id == current_user_id,
                        or_(DirectMessage.client_id == other_user_id, DirectMessage.specialist_id == other_user_id),
                    ),
                    and_(
                        DirectMessage.sender_id == other_user_id,
                        or_(DirectMessage.client_id == current_user_id, DirectMessage.specialist_id == current_user_id),
                    ),
                )
            )
            .order_by(DirectMessage.created_at.asc())
            .limit(100)
        )

    res = await db.execute(stmt)
    messages = res.scalars().all()
    
    sender_ids = {m.sender_id for m in messages}
    if sender_ids:
        users_stmt = select(User).where(User.id.in_(sender_ids))
        users_res = await db.execute(users_stmt)
        users_map = {u.id: u for u in users_res.scalars().all()}
    else:
        users_map = {}

    return [
        {
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "sender_name": users_map.get(m.sender_id).full_name if users_map.get(m.sender_id) else "User",
            "message": m.message,
            "thread_type": m.thread_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.post("/messages", response_model=dict[str, Any], status_code=201)
async def send_message(
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Send a direct message or channel message."""
    current_user_id = actor.user_id

    sender_user = await db.get(User, current_user_id)
    sender_name = sender_user.full_name or "Someone" if sender_user else "Someone"

    if payload.channel:
        client_id = payload.client_id or (current_user_id if actor.role in (UserRole.CLIENT, "client") else current_user_id)
        specialist_id = current_user_id

        new_msg = DirectMessage(
            client_id=client_id,
            specialist_id=specialist_id,
            sender_id=current_user_id,
            message=payload.message,
            thread_type=payload.channel,
        )
        db.add(new_msg)

        if actor.role in (UserRole.CLIENT, "client"):
            admins_stmt = select(User).where(User.role.in_([UserRole.ADMIN, "admin", "super_admin", "ops_admin", UserRole.TEAM_LEAD, "team_lead"]))
            admins_res = await db.execute(admins_stmt)
            for admin_user in admins_res.scalars().all():
                notification = Notification(
                    user_id=admin_user.id,
                    title=f"New message from {sender_name} in #{payload.channel}",
                    message=payload.message[:100] + ("..." if len(payload.message) > 100 else ""),
                    link=f"/slack?channel={payload.channel}",
                    is_read=False,
                )
                db.add(notification)
    else:
        if not payload.recipient_id:
            raise HTTPException(status_code=400, detail="Either channel or recipient_id must be provided")

        if actor.role in (UserRole.CLIENT, "client"):
            client_id = current_user_id
            specialist_id = payload.recipient_id
        else:
            client_id = payload.recipient_id
            specialist_id = current_user_id

        target_user = await db.get(User, payload.recipient_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Recipient not found")

        new_msg = DirectMessage(
            client_id=client_id,
            specialist_id=specialist_id,
            sender_id=current_user_id,
            message=payload.message,
            thread_type="direct",
        )
        db.add(new_msg)

        if target_user.role in (UserRole.CLIENT, "client"):
            link_url = "/portal/creative-pod"
        else:
            link_url = "/slack"
            
        notification = Notification(
            user_id=payload.recipient_id,
            title=f"New direct message from {sender_name}",
            message=payload.message[:100] + ("..." if len(payload.message) > 100 else ""),
            link=link_url,
            is_read=False,
        )
        db.add(notification)

    await db.commit()
    await db.refresh(new_msg)

    return {
        "id": str(new_msg.id),
        "sender_id": str(new_msg.sender_id),
        "sender_name": sender_name,
        "message": new_msg.message,
        "thread_type": new_msg.thread_type,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
    }
