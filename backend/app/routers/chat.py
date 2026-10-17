"""Chat router: Direct messaging and pod channel communication."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.chat import DirectMessage
from app.models.enums import UserRole
from app.models.ops import Notification
from app.models.user import User

# Shared staff rooms with no client attached. They are keyed only by thread_type, so a
# client_id must not be required to read them.
STAFF_CHANNELS = frozenset(
    {"general", "deliverables-handoff", "urgent-escalations", "all-pod-leads"}
)


def _is_staff_channel(channel: str | None) -> bool:
    """Staff rooms: the fixed set above plus per-pod rooms such as `pod-beta-team`."""
    if not channel:
        return False
    return channel in STAFF_CHANNELS or (
        channel.startswith("pod-") and channel.endswith("-team")
    )

router = APIRouter(prefix="/chat", tags=["Chat"])
POD_CHAT_ROLES = ("team_lead", "video_editor", "editor", "graphic_designer", "designer")


class ChatConnectionManager:
    """Manages active WebSocket connections for instant live messaging."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(
        self, user_id: str, websocket: WebSocket, subprotocol: str | None = None
    ) -> None:
        await websocket.accept(subprotocol=subprotocol)
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

    async def broadcast_new_message(
        self, message_data: dict[str, Any], recipient_ids: set[uuid.UUID]
    ) -> None:
        """Broadcast a message only to the authenticated participants in its thread."""
        for user_id in {str(recipient_id) for recipient_id in recipient_ids}:
            websockets = self.active_connections.get(user_id, [])
            for ws in list(websockets):
                try:
                    await ws.send_json({"type": "NEW_MESSAGE", "payload": message_data})
                except Exception:
                    pass


ws_manager = ChatConnectionManager()


def _role_name(role: Any) -> str:
    return str(getattr(role, "value", role)).lower()


def _is_admin_role(role: Any) -> bool:
    return _role_name(role) in {UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value}


async def _require_completed_onboarding(actor: Actor, db: AsyncSession) -> None:
    if _role_name(actor.role) != UserRole.CLIENT.value:
        return

    from app.services.onboarding_service import get_current_stage, get_onboarding_status

    client_id = actor.user_id
    stage = await get_current_stage(db, client_id)
    if stage < 8:
        status = await get_onboarding_status(db, client_id, known_stage=stage)
        raise HTTPException(
            status_code=403,
            detail={
                "code": "ONBOARDING_INCOMPLETE",
                "message": "Complete workspace setup before using direct chat.",
                "stage": status.stage,
                "next_required_stage": status.next_required_stage,
                "next_route": status.next_route,
                "resume_section": status.resume_section,
            },
        )


async def _require_client_assignment(actor: Actor, client_id: uuid.UUID, db: AsyncSession) -> None:
    role = _role_name(actor.role)
    if role == UserRole.CLIENT.value:
        if client_id != actor.user_id:
            raise HTTPException(status_code=403, detail="You can only access your own client chat.")
        await _require_completed_onboarding(actor, db)
        return

    client_actor = Actor(user_id=client_id, role=UserRole.CLIENT, client_id=client_id)
    await _require_completed_onboarding(client_actor, db)

    if _is_admin_role(role):
        return

    from app.models.work import ClientAssignment

    assignment_id = await db.scalar(
        select(ClientAssignment.id)
        .where(
            ClientAssignment.client_id == client_id,
            ClientAssignment.user_id == actor.user_id,
            ClientAssignment.role.in_(POD_CHAT_ROLES),
        )
        .limit(1)
    )
    if assignment_id is None:
        raise HTTPException(status_code=403, detail="You are not assigned to this client.")


async def _require_direct_chat_access(actor: Actor, target: User, db: AsyncSession) -> None:
    role = _role_name(actor.role)
    target_role = _role_name(target.role)
    if target.id == actor.user_id:
        raise HTTPException(status_code=400, detail="You cannot start a chat with yourself.")

    if role == UserRole.CLIENT.value:
        await _require_completed_onboarding(actor, db)
        if _is_admin_role(target_role):
            support_id = await db.scalar(
                select(User.id)
                .where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
                .where(User.account_status == "active")
                .order_by((User.role == UserRole.SUPER_ADMIN).desc(), User.created_at.asc())
                .limit(1)
            )
            if support_id == target.id:
                return
            raise HTTPException(
                status_code=403, detail="You can only chat with the designated support contact."
            )
        from app.models.work import ClientAssignment

        assignment_id = await db.scalar(
            select(ClientAssignment.id)
            .where(
                ClientAssignment.client_id == actor.user_id,
                ClientAssignment.user_id == target.id,
                ClientAssignment.role.in_(POD_CHAT_ROLES),
            )
            .limit(1)
        )
        if assignment_id is None:
            raise HTTPException(status_code=403, detail="You can only chat with your assigned pod.")
        return

    if target_role == UserRole.CLIENT.value:
        client_actor = Actor(user_id=target.id, role=UserRole.CLIENT, client_id=target.id)
        await _require_completed_onboarding(client_actor, db)
        if _is_admin_role(role):
            support_id = await db.scalar(
                select(User.id)
                .where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
                .where(User.account_status == "active")
                .order_by((User.role == UserRole.SUPER_ADMIN).desc(), User.created_at.asc())
                .limit(1)
            )
            if actor.user_id == support_id:
                return
            raise HTTPException(
                status_code=403,
                detail="Only the designated support contact can start a client chat.",
            )
        await _require_client_assignment(actor, target.id, db)
        return

    if _is_admin_role(role) or _is_admin_role(target_role):
        return

    # Internal agency team members (leads, specialists, designers, editors) can chat directly with each other
    if role != UserRole.CLIENT.value and target_role != UserRole.CLIENT.value:
        return

    from app.models.work import ClientAssignment

    shared_client = select(ClientAssignment.client_id).where(
        ClientAssignment.user_id == actor.user_id
    )
    shared_assignment = await db.scalar(
        select(ClientAssignment.id)
        .where(
            ClientAssignment.user_id == target.id,
            ClientAssignment.client_id.in_(shared_client),
        )
        .limit(1)
    )
    if shared_assignment is None:
        raise HTTPException(
            status_code=403, detail="You can only chat with your assigned pod members."
        )


@router.websocket("/ws/{user_id}")
async def chat_websocket(websocket: WebSocket, user_id: str) -> None:
    """Authenticated real-time sync, scoped to the current user's chat threads."""
    protocols = [
        item.strip() for item in websocket.headers.get("sec-websocket-protocol", "").split(",")
    ]
    token = protocols[1] if len(protocols) == 2 and protocols[0] == "creo-chat" else ""
    try:
        from app.core.cache import is_user_suspended_in_cache
        from app.core.security import decode_token

        payload = decode_token(token, expected_type="access")
        actor_id = uuid.UUID(payload["sub"])
        path_user_id = uuid.UUID(user_id)
        if actor_id != path_user_id or payload.get("must_reset_password") is True:
            raise ValueError("WebSocket identity mismatch")
        if await is_user_suspended_in_cache(actor_id, agency_id=payload.get("agency_id")):
            raise ValueError("User account is suspended")
    except Exception:
        await websocket.close(code=4401, reason="Authentication required")
        return

    if _role_name(payload.get("role", "client")) == UserRole.CLIENT.value:
        from app.db.session import AsyncSessionLocal

        try:
            async with AsyncSessionLocal() as db:
                actor = Actor(user_id=actor_id, role=UserRole.CLIENT, client_id=actor_id)
                await _require_completed_onboarding(actor, db)
        except HTTPException:
            await websocket.close(code=4403, reason="Onboarding incomplete")
            return

    await ws_manager.connect(user_id, websocket, subprotocol="creo-chat")
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
    message: str = Field(..., min_length=1, max_length=10_000)
    thread_type: str = "direct"


@router.get("/super-admin", response_model=dict[str, Any])
async def get_super_admin(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Fetch designated Super Admin user profile for direct support escalations."""
    await _require_completed_onboarding(actor, db)
    stmt = (
        select(User)
        .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin"]))
        .where(User.account_status == "active")
        .order_by(User.created_at.asc())
        .limit(1)
    )
    res = await db.execute(stmt)
    sa = res.scalar_one_or_none()
    if not sa:
        stmt = (
            select(User)
            .where(User.role.in_([UserRole.ADMIN, "admin"]))
            .where(User.account_status == "active")
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
        "is_super_admin": _role_name(sa.role) == UserRole.SUPER_ADMIN.value,
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
    role = _role_name(actor.role)

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
        from app.services.onboarding_service import get_current_stage

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
    await _require_completed_onboarding(actor, db)
    if not other_user_id and not channel:
        return []

    if other_user_id:
        target = await db.get(User, other_user_id)
        if not target:
            raise HTTPException(status_code=404, detail="Chat contact not found")
        await _require_direct_chat_access(actor, target, db)
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
        if is_client_user and _is_staff_channel(channel):
            return []

        effective_client_id = (
            actor.user_id if is_client_user else client_id
        )

        # Staff-only rooms carry no client, so they are keyed by thread_type alone.
        if _is_staff_channel(channel):
            stmt = (
                select(DirectMessage)
                .where(DirectMessage.thread_type == channel)
                .order_by(DirectMessage.created_at.asc())
                .limit(200)
            )
        elif effective_client_id and channel and (
            channel.startswith("client-")
            or channel in ("pod-direct-chat", "pod-creative", "pod-creative-hub", "client-pod-thread", "pod-team-chat")
        ):
            await _require_completed_onboarding(actor, db)
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
            await _require_completed_onboarding(actor, db)
        else:
            effective_client_id = client_id
            if effective_client_id is None and channel and channel.startswith("client-"):
                try:
                    effective_client_id = uuid.UUID(channel.removeprefix("client-"))
                except ValueError as err:
                    raise HTTPException(status_code=400, detail="Invalid client channel") from err
            if effective_client_id is None:
                raise HTTPException(
                    status_code=400, detail="client_id is required for a shared channel"
                )
            await _require_client_assignment(actor, effective_client_id, db)

            if channel not in {"pod-direct-chat", f"client-{effective_client_id}"}:
                raise HTTPException(status_code=400, detail="Invalid client channel")
            stmt = (
                select(DirectMessage)
                .where(
                    DirectMessage.client_id == effective_client_id,
                    DirectMessage.thread_type != "direct",
                )
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
            "sender_name": users_map.get(m.sender_id).full_name
            if users_map.get(m.sender_id)
            else "User",
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
    role = _role_name(actor.role)
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be blank")
    await _require_completed_onboarding(actor, db)

    sender_user = await db.get(User, current_user_id)
    sender_name = sender_user.full_name or "Someone" if sender_user else "Someone"
    sender_role = str(sender_user.role if sender_user else actor.role).lower()

    is_sender_admin = sender_role in ("admin", "super_admin", "ops_admin")
    is_sender_tl = sender_role in ("team_lead", "lead")
    is_sender_client = sender_role in ("client",)
    is_sender_tm = not (is_sender_admin or is_sender_tl or is_sender_client)

    websocket_recipients: set[uuid.UUID] = {current_user_id}

    if payload.channel:
        # Enforce channel permissions:
        # Client can ONLY post in their dedicated client pod channel (#pod-creative-hub or client-*)
        if is_sender_client and (
            _is_staff_channel(payload.channel) or payload.channel == "pod-team-chat"
        ):
            raise HTTPException(
                status_code=403,
                detail="Clients can only message in their dedicated Pod Hub channel (#pod-creative-hub)."
            )

        is_client_user = is_sender_client
        client_id = current_user_id if is_client_user else (payload.client_id or current_user_id)
        specialist_id = current_user_id

        # Determine notification and broadcast recipients
        recipients: set[uuid.UUID] = set()
        if is_client_user:
            from app.models.work import ClientAssignment
            assignments_stmt = (
                select(ClientAssignment.user_id)
                .where(ClientAssignment.client_id == client_id)
            )
            assignments_res = await db.execute(assignments_stmt)
            assigned_user_ids = set(assignments_res.scalars().all())

            if not assigned_user_ids:
                admins_stmt = select(User.id).where(
                    User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD]),
                    User.account_status == "active",
                )
                assigned_user_ids = set((await db.execute(admins_stmt)).scalars().all())

            recipients = assigned_user_ids
        elif _is_staff_channel(payload.channel):
            staff_stmt = select(User.id).where(
                User.role.in_([
                    UserRole.ADMIN,
                    UserRole.SUPER_ADMIN,
                    UserRole.TEAM_LEAD,
                    UserRole.EDITOR,
                    UserRole.DESIGNER,
                ]),
                User.account_status == "active",
            )
            recipients = set((await db.execute(staff_stmt)).scalars().all())
        else:
            if client_id and client_id != current_user_id:
                recipients = {client_id}

        new_msg = DirectMessage(
            client_id=client_id,
            specialist_id=specialist_id,
            sender_id=current_user_id,
            message=payload.message,
            thread_type=payload.channel,
        )
        db.add(new_msg)

        recipients.discard(current_user_id)
        websocket_recipients.update(recipients)

        for recipient_id in recipients:
            notification = Notification(
                user_id=recipient_id,
                title=f"New message from {sender_name} in #{payload.channel}",
                message=payload.message[:100] + ("..." if len(payload.message) > 100 else ""),
                link=f"/portal/slack?channel={payload.channel}"
                if recipient_id == client_id and not is_client_user
                else f"/slack?channel={payload.channel}",
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
        await _require_direct_chat_access(actor, target_user, db)

        target_role = str(target_user.role).lower()
        is_target_admin = target_role in ("admin", "super_admin", "ops_admin")
        is_target_tl = target_role in ("team_lead", "lead")
        is_target_client = target_role in ("client",)

        # STRICT ROLE AUTHORIZATION RULES:
        if is_sender_client:
            if not (is_target_admin or is_target_tl):
                raise HTTPException(
                    status_code=403,
                    detail="Clients are only permitted to message Team Leads and Administrators."
                )
        elif is_sender_tl:
            if not (is_target_admin or is_target_client):
                raise HTTPException(
                    status_code=403,
                    detail="Team Leads can only direct message Administrators and Clients."
                )
        elif is_sender_tm:
            if not is_target_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Team members are only permitted to message Administrators."
                )
        elif is_sender_admin:
            if target_user.id == current_user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot direct message yourself."
                )

        if actor.role in (UserRole.CLIENT, "client"):
            client_id = current_user_id
            specialist_id = payload.recipient_id
        elif _role_name(target_user.role) == UserRole.CLIENT.value:
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
        websocket_recipients.add(target_user.id)

        if _role_name(target_user.role) == UserRole.CLIENT.value:
            link_url = f"/portal/slack?dm={current_user_id}"
        else:
            link_url = f"/slack?dm={current_user_id}"

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

    # Dispatch live updates only to participants of this specific thread.
    await ws_manager.broadcast_new_message(response_data, websocket_recipients)

    return response_data
