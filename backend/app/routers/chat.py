"""Chat router: Direct messaging and pod channel communication."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.chat import DirectMessage
from app.models.ops import Notification
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatConnectionManager:
    """Manages active WebSocket connections for instant live messaging."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_new_message(self, message_data: dict[str, Any]) -> None:
        """Broadcast new message alert to all active connections."""
        for user_id, websockets in list(self.active_connections.items()):
            for ws in list(websockets):
                try:
                    await ws.send_json({"type": "NEW_MESSAGE", "payload": message_data})
                except Exception:
                    pass


ws_manager = ChatConnectionManager()


@router.websocket("/ws/{user_id}")
async def chat_websocket(websocket: WebSocket, user_id: str) -> None:
    """Real-time WebSocket endpoint for instant chat synchronization."""
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)


class SendMessageRequest(BaseModel):
    recipient_id: uuid.UUID | None = None
    channel: str | None = None
    client_id: uuid.UUID | None = None
    message: str = Field(..., min_length=1)
    thread_type: str = "direct"


@router.get("/super-admin", response_model=dict[str, Any])
async def get_super_admin(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Fetch designated Super Admin user profile for direct support escalations."""
    stmt = (
        select(User)
        .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin"]))
        .order_by(User.created_at.asc())
        .limit(1)
    )
    res = await db.execute(stmt)
    sa = res.scalar_one_or_none()
    if not sa:
        stmt = (
            select(User)
            .where(User.role.in_([UserRole.ADMIN, "admin"]))
            .order_by(User.created_at.asc())
            .limit(1)
        )
        res = await db.execute(stmt)
        sa = res.scalar_one_or_none()

    if not sa:
        raise HTTPException(status_code=404, detail="No admin found")

    return {
        "id": str(sa.id),
        "name": sa.full_name or "Creo Super Admin",
        "email": sa.email,
        "role": "Super Admin & Executive Escalations",
        "is_super_admin": True,
        "online": True,
    }


@router.get("/contacts", response_model=list[dict[str, Any]])
async def get_chat_contacts(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> list[dict[str, Any]]:
    """Return available direct message contacts depending on user role."""
    contacts: list[dict[str, Any]] = []
    current_user_id = actor.user_id

    # 1. Super Admin is always available for clients and specialists
    sa_stmt = (
        select(User)
        .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin"]))
        .order_by(User.created_at.asc())
        .limit(1)
    )
    sa_res = await db.execute(sa_stmt)
    sa = sa_res.scalar_one_or_none()
    if sa and sa.id != current_user_id:
        contacts.append(
            {
                "id": str(sa.id),
                "name": sa.full_name or "Creo Super Admin",
                "email": sa.email,
                "role": "Super Admin & Executive Support",
                "is_super_admin": True,
                "online": True,
            }
        )

    # 2. If client: fetch assigned pod specialists
    if actor.role in (UserRole.CLIENT, "client"):
        from app.models.work import ClientAssignment

        pod_stmt = (
            select(ClientAssignment, User)
            .join(User, User.id == ClientAssignment.user_id)
            .where(ClientAssignment.client_id == current_user_id)
            .order_by(
                (ClientAssignment.role == "team_lead").desc(),
                (ClientAssignment.role == "video_editor").desc(),
            )
        )
        pod_res = await db.execute(pod_stmt)
        role_labels = {
            "team_lead": "Team Lead & Account Director",
            "video_editor": "Lead Video Editor (Reels & Motion)",
            "graphic_designer": "Lead Graphic Designer (Posters & Carousels)",
        }
        for ca, u in pod_res.all():
            contacts.append(
                {
                    "id": str(u.id),
                    "name": u.full_name or u.email.split("@")[0].capitalize(),
                    "email": u.email,
                    "role": role_labels.get(ca.role, "Pod Specialist"),
                    "is_super_admin": False,
                    "online": True,
                }
            )
    else:
        # If admin or specialist: return client roster for direct messaging
        client_stmt = select(User).where(User.role == "client").order_by(User.full_name.asc())
        client_res = await db.execute(client_stmt)
        for cu in client_res.scalars().all():
            if cu.id != current_user_id:
                contacts.append(
                    {
                        "id": str(cu.id),
                        "name": cu.full_name or cu.email.split("@")[0],
                        "email": cu.email,
                        "role": "Client Representative",
                        "is_client": True,
                        "online": True,
                    }
                )

    return contacts


@router.get("/messages", response_model=list[dict[str, Any]])
async def get_messages(
    other_user_id: uuid.UUID | None = None,
    channel: str | None = None,
    client_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> list[dict[str, Any]]:
    """Fetch 1-on-1 or channel chat history with full multi-device live sync."""
    if not other_user_id and not channel:
        return []

    if other_user_id:
        current_user_id = actor.user_id
        stmt = (
            select(DirectMessage)
            .where(
                DirectMessage.thread_type == "direct",
                or_(
                    (DirectMessage.sender_id == current_user_id)
                    & (
                        (DirectMessage.client_id == other_user_id)
                        | (DirectMessage.specialist_id == other_user_id)
                    ),
                    (DirectMessage.sender_id == other_user_id)
                    & (
                        (DirectMessage.client_id == current_user_id)
                        | (DirectMessage.specialist_id == current_user_id)
                    ),
                    (DirectMessage.client_id == current_user_id)
                    & (DirectMessage.specialist_id == other_user_id),
                    (DirectMessage.client_id == other_user_id)
                    & (DirectMessage.specialist_id == current_user_id),
                ),
            )
            .order_by(DirectMessage.created_at.asc())
            .limit(200)
        )
    else:
        # Channel query
        effective_client_id = (
            actor.user_id if actor.role in (UserRole.CLIENT, "client") else client_id
        )

        if effective_client_id and channel and (channel.startswith("client-") or channel == "pod-direct-chat"):
            stmt = (
                select(DirectMessage)
                .where(
                    or_(
                        (DirectMessage.client_id == effective_client_id)
                        & (DirectMessage.thread_type != "direct"),
                        DirectMessage.thread_type == channel,
                    )
                )
                .order_by(DirectMessage.created_at.asc())
                .limit(200)
            )
        else:
            stmt = (
                select(DirectMessage)
                .where(DirectMessage.thread_type == channel)
                .order_by(DirectMessage.created_at.asc())
                .limit(200)
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
    """Send a direct message or channel message with real-time broadcast."""
    current_user_id = actor.user_id

    sender_user = await db.get(User, current_user_id)
    sender_name = sender_user.full_name or "Someone" if sender_user else "Someone"

    if payload.channel:
        is_client_user = actor.role in (UserRole.CLIENT, "client")
        client_id = current_user_id if is_client_user else (payload.client_id or current_user_id)
        specialist_id = current_user_id

        new_msg = DirectMessage(
            client_id=client_id,
            specialist_id=specialist_id,
            sender_id=current_user_id,
            message=payload.message,
            thread_type=payload.channel,
        )
        db.add(new_msg)

        if is_client_user:
            # Client posting to channel: notify admin and pod staff
            admins_stmt = select(User).where(
                User.role.in_(
                    [
                        UserRole.ADMIN,
                        "admin",
                        UserRole.SUPER_ADMIN,
                        "super_admin",
                        "ops_admin",
                        UserRole.TEAM_LEAD,
                        "team_lead",
                    ]
                )
            )
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
            # Staff or Admin posting to a client channel: notify the client
            if client_id and client_id != current_user_id:
                notification = Notification(
                    user_id=client_id,
                    title=f"New message from {sender_name} in #{payload.channel}",
                    message=payload.message[:100] + ("..." if len(payload.message) > 100 else ""),
                    link="/portal/slack",
                    is_read=False,
                )
                db.add(notification)
    else:
        if not payload.recipient_id:
            raise HTTPException(
                status_code=400, detail="Either channel or recipient_id must be provided"
            )

        target_user = await db.get(User, payload.recipient_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Recipient not found")

        if actor.role in (UserRole.CLIENT, "client"):
            client_id = current_user_id
            specialist_id = payload.recipient_id
        elif target_user.role in (UserRole.CLIENT, "client"):
            client_id = payload.recipient_id
            specialist_id = current_user_id
        else:
            client_id = current_user_id
            specialist_id = payload.recipient_id

        new_msg = DirectMessage(
            client_id=client_id,
            specialist_id=specialist_id,
            sender_id=current_user_id,
            message=payload.message,
            thread_type="direct",
        )
        db.add(new_msg)

        if target_user.role in (UserRole.CLIENT, "client"):
            link_url = "/portal/slack"
        else:
            link_url = f"/slack?dm={sender_name}"

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

    response_data = {
        "id": str(new_msg.id),
        "sender_id": str(new_msg.sender_id),
        "sender_name": sender_name,
        "message": new_msg.message,
        "thread_type": new_msg.thread_type,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
    }

    # Dispatch instant live update via WebSocket
    await ws_manager.broadcast_new_message(response_data)

    return response_data
