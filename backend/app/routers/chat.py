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
    """Return available direct message contacts strictly enforcing role permissions:
    - Client: can ONLY message TL and Admin.
    - TL: can message Admin, Client, and Team Members.
    - Team Members: can ONLY message Admin and TL.
    - Admin: can message ALL.
    """
    contacts: list[dict[str, Any]] = []
    current_user_id = actor.user_id

    current_user = await db.get(User, current_user_id)
    raw_role = current_user.role if current_user else actor.role
    user_role = str(raw_role).lower()

    is_admin = user_role in ("admin", "super_admin", "ops_admin")
    is_tl = user_role in ("team_lead", "lead")
    is_client = user_role in ("client",)
    is_team_member = not (is_admin or is_tl or is_client)

    # 1. Fetch Super Admin & Admins (ONLY for non-admins: Client, TL, Team Members)
    # Admin must NOT have option to chat with admin
    if not is_admin:
        admin_stmt = (
            select(User)
            .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin", UserRole.ADMIN, "admin"]))
            .order_by(User.created_at.asc())
        )
        admin_res = await db.execute(admin_stmt)
        admins = admin_res.scalars().all()
        if is_client:
            # Client has only 2 chats: exactly 1 Super Admin and 1 assigned Pod Lead
            primary_admin = next((a for a in admins if str(a.role).lower() in ("super_admin",) and a.id != current_user_id), (admins[0] if admins else None))
            if primary_admin:
                contacts.append({
                    "id": str(primary_admin.id),
                    "name": primary_admin.full_name or "Creo Super Admin",
                    "email": primary_admin.email,
                    "role": "Super Admin & Executive Support",
                    "is_super_admin": True,
                    "online": True,
                })
        else:
            for adm in admins:
                if adm.id != current_user_id:
                    contacts.append(
                        {
                            "id": str(adm.id),
                            "name": adm.full_name or "Creo Admin",
                            "email": adm.email,
                            "role": "Super Admin & Executive Support" if str(adm.role).lower() in ("super_admin",) else "Workspace Admin",
                            "is_super_admin": str(adm.role).lower() in ("super_admin",),
                            "online": True,
                        }
                    )

    from app.models.work import ClientAssignment

    # RULE 1: CLIENT -> ONLY 2 CHATS: ADMIN AND POD LEAD
    if is_client:
        tl_stmt = (
            select(ClientAssignment, User)
            .join(User, User.id == ClientAssignment.user_id)
            .where(ClientAssignment.client_id == current_user_id, ClientAssignment.role == "team_lead")
        )
        tl_res = await db.execute(tl_stmt)
        tl_assigned = tl_res.all()

        if tl_assigned:
            for ca, u in tl_assigned:
                if u.id != current_user_id:
                    contacts.append({
                        "id": str(u.id),
                        "name": u.full_name or u.email.split("@")[0].capitalize(),
                        "email": u.email,
                        "role": "Team Lead & Account Director",
                        "is_super_admin": False,
                        "online": True,
                    })
        else:
            any_tl_stmt = select(User).where(User.role.in_([UserRole.TEAM_LEAD, "team_lead"])).limit(1)
            any_tl = (await db.execute(any_tl_stmt)).scalar_one_or_none()
            if any_tl and any_tl.id != current_user_id:
                contacts.append({
                    "id": str(any_tl.id),
                    "name": any_tl.full_name or "Sarah Connor (Pod Lead)",
                    "email": any_tl.email,
                    "role": "Team Lead & Account Director",
                    "is_super_admin": False,
                    "online": True,
                })

    # RULE 2: TL -> ADMIN AND CLIENTS (Pods communicate via Pod Groups)
    elif is_tl:
        client_stmt = select(User).where(User.role == "client").order_by(User.full_name.asc())
        client_res = await db.execute(client_stmt)
        for cu in client_res.scalars().all():
            if cu.id != current_user_id:
                contacts.append({
                    "id": str(cu.id),
                    "name": cu.full_name or cu.email.split("@")[0],
                    "email": cu.email,
                    "role": "Client",
                    "is_client": True,
                    "online": True,
                })

    # RULE 3: TEAM MEMBERS -> ADMIN ONLY (Pod communication in their Pod Group)
    elif is_team_member:
        # Admin is already added in step 1 above!
        pass

    # RULE 4: ADMIN -> ALL POD LEADS AND CLIENTS ONLY (NO OTHER ADMINS, NO INDIVIDUAL MEMBERS)
    elif is_admin:
        # A. All Team Leads (individual chat with each lead)
        tl_stmt = select(User).where(User.role.in_([UserRole.TEAM_LEAD, "team_lead"])).order_by(User.full_name.asc())
        for tu in (await db.execute(tl_stmt)).scalars().all():
            if tu.id != current_user_id:
                contacts.append({
                    "id": str(tu.id),
                    "name": tu.full_name or tu.email.split("@")[0].capitalize(),
                    "email": tu.email,
                    "role": "Team Lead & Account Director",
                    "online": True,
                })

        # B. All Clients (individual chat with each client)
        client_stmt = select(User).where(User.role == "client").order_by(User.full_name.asc())
        for cu in (await db.execute(client_stmt)).scalars().all():
            if cu.id != current_user_id:
                contacts.append({
                    "id": str(cu.id),
                    "name": cu.full_name or cu.email.split("@")[0],
                    "email": cu.email,
                    "role": "Client",
                    "is_client": True,
                    "online": True,
                })

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
                or_(
                    (DirectMessage.thread_type == "direct")
                    & or_(
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
                )
            )
            .order_by(DirectMessage.created_at.asc())
            .limit(200)
        )
    else:
        # Channel query
        is_client_user = str(actor.role).lower() in ("client",)
        if is_client_user and channel in ("general", "deliverables-handoff", "urgent-escalations"):
            return []

        effective_client_id = (
            actor.user_id if is_client_user else client_id
        )

        if effective_client_id and channel and (
            channel.startswith("client-")
            or channel in ("pod-direct-chat", "pod-creative", "pod-creative-hub", "client-pod-thread", "pod-team-chat")
        ):
            stmt = (
                select(DirectMessage)
                .where(
                    or_(
                        (DirectMessage.client_id == effective_client_id)
                        & (DirectMessage.thread_type != "direct"),
                        DirectMessage.thread_type == channel,
                        DirectMessage.thread_type.like("client-%"),
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
    sender_role = str(sender_user.role if sender_user else actor.role).lower()

    is_sender_admin = sender_role in ("admin", "super_admin", "ops_admin")
    is_sender_tl = sender_role in ("team_lead", "lead")
    is_sender_client = sender_role in ("client",)
    is_sender_tm = not (is_sender_admin or is_sender_tl or is_sender_client)

    if payload.channel:
        # Enforce channel permissions:
        # Client can ONLY post in their dedicated client pod channel (#pod-creative-hub or client-*)
        if is_sender_client and payload.channel in ("general", "deliverables-handoff", "urgent-escalations", "pod-team-chat"):
            raise HTTPException(
                status_code=403,
                detail="Clients can only message in their dedicated Pod Hub channel (#pod-creative-hub)."
            )

        is_client_user = is_sender_client
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

        target_role = str(target_user.role).lower()
        is_target_admin = target_role in ("admin", "super_admin", "ops_admin")
        is_target_tl = target_role in ("team_lead", "lead")
        is_target_client = target_role in ("client",)
        is_target_tm = not (is_target_admin or is_target_tl or is_target_client)

        # STRICT ROLE AUTHORIZATION RULES:
        # RULE 1: CLIENT CAN ONLY MESSAGE TL AND ADMIN
        if is_sender_client:
            if not (is_target_admin or is_target_tl):
                raise HTTPException(
                    status_code=403,
                    detail="Clients are only permitted to message Team Leads and Administrators."
                )

        # RULE 2: TL CAN MESSAGE ADMIN AND CLIENTS
        elif is_sender_tl:
            if not (is_target_admin or is_target_client):
                raise HTTPException(
                    status_code=403,
                    detail="Team Leads can only direct message Administrators and Clients."
                )

        # RULE 3: TEAM MEMBERS CAN ONLY MESSAGE ADMIN
        elif is_sender_tm:
            if not is_target_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Team members are only permitted to message Administrators."
                )

        # RULE 4: ADMIN CAN MESSAGE LEADS AND CLIENTS (NO ADMIN-TO-ADMIN, NO INDIVIDUAL MEMBERS)
        elif is_sender_admin:
            if is_target_admin:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot direct message an administrator account."
                )
            if not (is_target_tl or is_target_client):
                raise HTTPException(
                    status_code=403,
                    detail="Administrators can only direct message Team Leads and Clients. Use Pod Group channels to collaborate with team members."
                )

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
