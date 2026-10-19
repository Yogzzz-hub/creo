"""Chat router: Direct messaging and pod channel communication."""

from __future__ import annotations

import asyncio
from datetime import datetime
import io
import json
import os
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.chat import DirectMessage
from app.models.enums import UserRole
from app.models.ops import Notification
from app.models.user import User
from app.services.storage_service import (
    ALLOWED_MIMES,
    _LOCAL_STATIC_DIR,
    put_object,
    resolve_media_url,
)

# Shared staff rooms with no client attached. They are keyed only by thread_type, so a
# client_id must not be required to read them.
STAFF_CHANNELS = frozenset(
    {"general", "deliverables-handoff", "urgent-escalations", "all-pod-leads", "bde-sales-hub"}
)

_CUSTOM_GROUPS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "custom_groups.json")


def _load_custom_groups() -> list[dict[str, Any]]:
    if not os.path.exists(_CUSTOM_GROUPS_FILE):
        return []
    try:
        with open(_CUSTOM_GROUPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_custom_groups(groups: list[dict[str, Any]]) -> None:
    try:
        with open(_CUSTOM_GROUPS_FILE, "w", encoding="utf-8") as f:
            json.dump(groups, f, indent=2)
    except Exception as e:
        print(f"Error saving custom groups: {e}")


def _is_staff_channel(channel: str | None) -> bool:
    """Staff rooms: the fixed set above plus per-pod rooms such as `pod-beta-team` and custom groups."""
    if not channel:
        return False
    if channel in STAFF_CHANNELS:
        return True
    if channel.startswith("pod-") and channel.endswith("-team"):
        return True
    if channel.startswith("grp-") or channel.startswith("group-"):
        return True
    custom_ids = {g["id"] for g in _load_custom_groups()}
    return channel in custom_ids


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


async def _get_user_pod_info(user_id: uuid.UUID, db: AsyncSession) -> dict[str, Any]:
    """Inspect user's pod membership and lead status."""
    from app.models.tenant import Team, TeamMember

    # 1. Check if user is Team Lead of a team
    lead_team = (await db.execute(select(Team).where(Team.lead_id == user_id, Team.is_active.is_(True)))).scalar_one_or_none()
    if lead_team:
        member_ids = (await db.execute(select(TeamMember.user_id).where(TeamMember.team_id == lead_team.id))).scalars().all()
        normalized = lead_team.name.lower().replace(" ", "-")
        if "alpha" in normalized or "-a" in normalized:
            slug = "pod-alpha-team"
        elif "beta" in normalized or "-b" in normalized:
            slug = "pod-beta-team"
        elif "gamma" in normalized or "-c" in normalized:
            slug = "pod-gamma-team"
        else:
            slug = f"pod-{normalized}-team"

        return {
            "is_lead": True,
            "team_id": lead_team.id,
            "team_name": lead_team.name,
            "channel_slug": slug,
            "member_ids": set(member_ids) - {user_id},
        }

    # 2. Check if user is a member of a team
    tm_row = (await db.execute(
        select(TeamMember, Team)
        .join(Team, Team.id == TeamMember.team_id)
        .where(TeamMember.user_id == user_id, Team.is_active.is_(True))
    )).first()

    if tm_row:
        member_obj, team_obj = tm_row
        normalized = team_obj.name.lower().replace(" ", "-")
        if "alpha" in normalized or "-a" in normalized:
            slug = "pod-alpha-team"
        elif "beta" in normalized or "-b" in normalized:
            slug = "pod-beta-team"
        elif "gamma" in normalized or "-c" in normalized:
            slug = "pod-gamma-team"
        else:
            slug = f"pod-{normalized}-team"

        return {
            "is_lead": False,
            "team_id": team_obj.id,
            "team_name": team_obj.name,
            "channel_slug": slug,
            "lead_id": team_obj.lead_id,
        }

    return {"is_lead": False, "team_id": None, "team_name": None, "channel_slug": None, "member_ids": set(), "lead_id": None}


async def _require_direct_chat_access(actor: Actor, target: User, db: AsyncSession) -> None:
    role = _role_name(actor.role)
    target_role = _role_name(target.role)
    if target.id == actor.user_id:
        raise HTTPException(status_code=400, detail="You cannot start a chat with yourself.")

    is_actor_admin = _is_admin_role(role)
    is_target_admin = _is_admin_role(target_role)

    # Admins can initiate or receive direct chats with anyone (Clients, TLs, Team Members, BDE, Freelancers)
    if is_actor_admin or is_target_admin:
        return

    # RULE 1: Freelancer can ONLY chat with Admin
    if role == "freelancer" or target_role == "freelancer":
        raise HTTPException(
            status_code=403,
            detail="Freelancers can only communicate directly with Workspace Administrators.",
        )

    # RULE 2: Client restrictions
    if role == UserRole.CLIENT.value:
        await _require_completed_onboarding(actor, db)
        if target_role in ("sales", "bde"):
            return
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
            raise HTTPException(status_code=403, detail="You can only chat with your assigned pod lead.")
        return

    if target_role == UserRole.CLIENT.value:
        client_actor = Actor(user_id=target.id, role=UserRole.CLIENT, client_id=target.id)
        await _require_completed_onboarding(client_actor, db)
        if role in ("sales", "bde"):
            return
        await _require_client_assignment(actor, target.id, db)
        return

    # RULE 3: BDE can only chat with clients, admins, and other BDE members
    if role in ("sales", "bde"):
        if target_role not in ("client", "sales", "bde"):
            raise HTTPException(status_code=403, detail="BDE representatives can only chat with clients, administrators, and other BDE members.")
        return

    if target_role in ("sales", "bde"):
        if role not in ("client", "sales", "bde"):
            raise HTTPException(status_code=403, detail="You cannot chat directly with BDE representatives.")
        return

    # RULE 4: Team Leads (TL) vs Team Members (TM)
    is_actor_tl = role in ("team_lead", "lead")
    is_target_tl = target_role in ("team_lead", "lead")

    # TL to TL direct message: they use the #all-pod-leads leadership group chat
    if is_actor_tl and is_target_tl:
        raise HTTPException(status_code=403, detail="Team Leads collaborate via the #all-pod-leads leadership group chat.")

    # Team Member messaging a Team Lead: can ONLY message their own Pod Lead
    if not is_actor_tl and is_target_tl:
        pod_info = await _get_user_pod_info(actor.user_id, db)
        if pod_info.get("lead_id") != target.id:
            raise HTTPException(status_code=403, detail="You can only direct message your own assigned Pod Lead.")
        return

    # Team Lead messaging a Team Member: can ONLY message members from their own Pod
    if is_actor_tl and not is_target_tl:
        pod_info = await _get_user_pod_info(actor.user_id, db)
        if target.id not in pod_info.get("member_ids", set()):
            raise HTTPException(status_code=403, detail="You can only direct message members of your own Pod.")
        return

    # Team Member to Team Member from different pods
    pod_actor = await _get_user_pod_info(actor.user_id, db)
    pod_target = await _get_user_pod_info(target.id, db)
    if pod_actor.get("team_id") and pod_actor.get("team_id") == pod_target.get("team_id"):
        return
    raise HTTPException(status_code=403, detail="Direct messaging is restricted to your own Pod.")


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


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    desc: str = Field(default="", max_length=255)
    member_ids: list[str] = Field(default_factory=list)
    is_pod_channel: bool = Field(default=False)


@router.post("/groups", response_model=dict[str, Any], status_code=201)
async def create_chat_group(
    payload: CreateGroupRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> dict[str, Any]:
    """Create a new chat group. Permitted ONLY for Workspace Administrators and Team Leads."""
    current_user_id = actor.user_id
    current_user = await db.get(User, current_user_id)
    raw_role = current_user.role if current_user else actor.role
    role_val = getattr(raw_role, "value", str(raw_role)).lower()

    is_admin = role_val in ("admin", "super_admin", "ops_admin") or "admin" in role_val
    is_tl = role_val in ("team_lead", "lead") or "lead" in role_val

    if not (is_admin or is_tl):
        raise HTTPException(
            status_code=403,
            detail="Only Workspace Administrators and Team Leads have permission to create chat groups.",
        )

    creator_name = (current_user.full_name if current_user else "") or ("Team Lead" if is_tl else "Admin")

    raw_name = payload.name.strip().lstrip("#")
    slug = re.sub(r"[^a-z0-9]+", "-", raw_name.lower()).strip("-")[:35]
    if not slug:
        slug = f"group-{uuid.uuid4().hex[:6]}"

    group_id = f"grp-{slug}"
    existing_groups = _load_custom_groups()

    if any(g.get("id") == group_id for g in existing_groups):
        group_id = f"grp-{slug[:30]}-{uuid.uuid4().hex[:4]}"

    member_ids_clean = list({str(m) for m in payload.member_ids if m} | {str(current_user_id)})

    new_group = {
        "id": group_id,
        "label": raw_name,
        "desc": payload.desc.strip() or f"Created by {creator_name} • {len(member_ids_clean)} members",
        "created_by": str(current_user_id),
        "creator_name": creator_name,
        "creator_role": role_val,
        "member_ids": member_ids_clean,
        "is_pod_channel": payload.is_pod_channel,
        "is_custom_group": True,
        "created_at": datetime.utcnow().isoformat(),
    }

    existing_groups.append(new_group)
    _save_custom_groups(existing_groups)

    # Seed an intro welcome message in DirectMessage
    try:
        welcome_msg = DirectMessage(
            client_id=current_user_id,
            specialist_id=current_user_id,
            sender_id=current_user_id,
            message=f"👋 Welcome to #{raw_name}! Group created by {creator_name}.",
            thread_type=group_id,
        )
        db.add(welcome_msg)
        await db.commit()
    except Exception as e:
        print(f"Warning: could not insert welcome message: {e}")

    # Broadcast new group creation to connected websockets
    try:
        recipient_uuids = {uuid.UUID(mid) for mid in member_ids_clean if mid}
        await ws_manager.broadcast_new_message(
            {
                "type": "GROUP_CREATED",
                "group": new_group,
            },
            recipient_uuids,
        )
    except Exception:
        pass

    return new_group


class SendMessageRequest(BaseModel):
    recipient_id: uuid.UUID | None = None
    channel: str | None = None
    client_id: uuid.UUID | None = None
    message: str = Field(default="", max_length=10_000)
    thread_type: str = "direct"
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None
    attachment_size: int | None = None


@router.post("/upload", response_model=dict[str, Any])
async def upload_chat_attachment(
    file: UploadFile = File(...),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Upload a file attachment for direct or channel chat."""
    await _require_completed_onboarding(actor, db)

    filename = file.filename or "attachment"
    content_type = file.content_type or "application/octet-stream"

    contents = await file.read()
    size_bytes = len(contents)
    if size_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if size_bytes > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Attachment size exceeds 50MB limit.")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    storage_mime = content_type
    if content_type not in ALLOWED_MIMES:
        for mime, allowed_ext in ALLOWED_MIMES.items():
            if allowed_ext == ext:
                storage_mime = mime
                break
        else:
            storage_mime = "application/octet-stream"

    storage_key = f"chat/{actor.user_id}/{uuid.uuid4().hex}.{ext}"

    try:
        raw_stored_url = await asyncio.to_thread(
            put_object,
            storage_key,
            io.BytesIO(contents),
            storage_mime if storage_mime in ALLOWED_MIMES else "application/pdf",
            size_bytes,
        )
    except Exception:
        local_dir = os.path.join(_LOCAL_STATIC_DIR, "chat")
        os.makedirs(local_dir, exist_ok=True)
        file_path = os.path.join(local_dir, f"{uuid.uuid4().hex}_{filename}")
        with open(file_path, "wb") as f:
            f.write(contents)
        rel_path = os.path.relpath(file_path, _LOCAL_STATIC_DIR).replace("\\", "/")
        raw_stored_url = f"/static/{rel_path}"

    resolved_url = resolve_media_url(raw_stored_url)

    return {
        "attachment_url": resolved_url,
        "attachment_name": filename,
        "attachment_type": content_type,
        "attachment_size": size_bytes,
    }


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


@router.get("/channels", response_model=list[dict[str, Any]])
async def get_chat_channels(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> list[dict[str, Any]]:
    """Return available Slack channels strictly filtered per role:
    - Freelancer: NONE (no channels, only direct DM with Admin)
    - Client: Only their dedicated #pod-creative-hub
    - Team Member: Only their own pod channel (e.g. #pod-beta-team) and #general / announcements
    - Team Lead: Their own pod channel, #all-pod-leads, and announcements
    - BDE: #bde-sales-hub and #general
    - Admin: All pod channels (#pod-alpha-team, #pod-beta-team, #pod-gamma-team), #bde-sales-hub, #all-pod-leads, and global channels
    """
    current_user_id = actor.user_id
    current_user = await db.get(User, current_user_id)
    raw_role = current_user.role if current_user else actor.role
    user_role = str(raw_role).lower()

    is_admin = user_role in ("admin", "super_admin", "ops_admin")
    is_freelancer = user_role in ("freelancer", "freelance")
    is_tl = user_role in ("team_lead", "lead")
    is_client = user_role in ("client",)
    is_bde = user_role in ("sales", "bde")
    is_team_member = not (is_admin or is_freelancer or is_tl or is_client or is_bde)

    # 1. Freelancers have NO channels
    if is_freelancer:
        return []

    # 2. Client: only their dedicated creative hub
    if is_client:
        client_name = ((current_user.full_name if current_user else "") or "client").lower().replace(" ", "-")
        return [
            {
                "id": f"client-{client_name}",
                "label": "pod-creative-hub",
                "desc": "Your dedicated Creative Pod (Team Lead & Super Admin)",
                "is_pod_channel": True,
            }
        ]

    channels: list[dict[str, Any]] = []

    # 3. Admin: All pods, BDE team, Team Leads council, and global channels
    if is_admin:
        channels.extend([
            {
                "id": "all-pod-leads",
                "label": "all-pod-leads",
                "desc": "Leadership Council: Executive Admin & All Pod Leads",
                "is_pod_channel": True,
            },
            {
                "id": "bde-sales-hub",
                "label": "bde-sales-hub",
                "desc": "BDE Commercial Outreach & Pipeline Command (Sales Reps & Admin)",
                "is_pod_channel": True,
            },
            {
                "id": "pod-alpha-team",
                "label": "pod-alpha-team",
                "desc": "Pod Alpha • Brand & Creative Design (Lead & Specialists)",
                "is_pod_channel": True,
            },
            {
                "id": "pod-beta-team",
                "label": "pod-beta-team",
                "desc": "Pod Beta • Performance Video & Reels (Lead & Specialists)",
                "is_pod_channel": True,
            },
            {
                "id": "pod-gamma-team",
                "label": "pod-gamma-team",
                "desc": "Pod Gamma • 3D Motion & CGI (Lead & Specialists)",
                "is_pod_channel": True,
            },
            {
                "id": "general",
                "label": "general",
                "desc": "Workspace standups, milestones, and announcements",
                "is_pod_channel": False,
            },
        ])

    # 4. Team Lead: Own pod group, all-pod-leads, global channels
    elif is_tl:
        pod_info = await _get_user_pod_info(current_user_id, db)
        slug = pod_info.get("channel_slug") or "pod-beta-team"
        pod_name = pod_info.get("team_name") or "Your Pod"
        channels.extend([
            {
                "id": "all-pod-leads",
                "label": "all-pod-leads",
                "desc": "Leadership Council: Executive Admin & All Pod Leads",
                "is_pod_channel": True,
            },
            {
                "id": slug,
                "label": slug,
                "desc": f"{pod_name} • Dedicated Pod Group (Team Lead, Specialists & Admin)",
                "is_pod_channel": True,
            },
            {
                "id": "general",
                "label": "general",
                "desc": "Workspace standups, milestones, and announcements",
                "is_pod_channel": False,
            },
        ])

    # 5. Team Member: ONLY their own pod group, NO other pods!
    elif is_team_member:
        pod_info = await _get_user_pod_info(current_user_id, db)
        slug = pod_info.get("channel_slug") or "pod-beta-team"
        pod_name = pod_info.get("team_name") or "Your Pod"
        channels.extend([
            {
                "id": slug,
                "label": slug,
                "desc": f"{pod_name} • Dedicated Pod Group (Team Lead, Specialists & Admin)",
                "is_pod_channel": True,
            },
            {
                "id": "general",
                "label": "general",
                "desc": "Workspace standups, milestones, and announcements",
                "is_pod_channel": False,
            },
        ])

    # 6. BDE: BDE Sales Hub and announcements
    elif is_bde:
        channels.extend([
            {
                "id": "bde-sales-hub",
                "label": "bde-sales-hub",
                "desc": "BDE Commercial Outreach & Pipeline Command (Sales Reps & Admin)",
                "is_pod_channel": True,
            },
            {
                "id": "general",
                "label": "general",
                "desc": "Workspace standups, milestones, and announcements",
                "is_pod_channel": False,
            },
        ])

    # Load custom groups created by Admin / TL
    custom_groups = _load_custom_groups()
    user_id_str = str(current_user_id)
    accessible_custom: list[dict[str, Any]] = []

    for cg in custom_groups:
        cg_obj = {
            "id": cg["id"],
            "label": cg.get("label") or cg["id"].removeprefix("grp-"),
            "desc": cg.get("desc") or "Custom Group",
            "is_pod_channel": cg.get("is_pod_channel", False),
            "is_custom_group": True,
            "created_by": cg.get("created_by"),
            "creator_name": cg.get("creator_name"),
            "member_ids": cg.get("member_ids", []),
        }
        if is_admin:
            accessible_custom.append(cg_obj)
        elif is_tl:
            if cg.get("created_by") == user_id_str or user_id_str in cg.get("member_ids", []) or not cg.get("member_ids"):
                accessible_custom.append(cg_obj)
        elif is_team_member or is_bde:
            if user_id_str in cg.get("member_ids", []):
                accessible_custom.append(cg_obj)

    return channels + accessible_custom


@router.get("/contacts", response_model=list[dict[str, Any]])
async def get_chat_contacts(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(get_current_actor),
) -> list[dict[str, Any]]:
    """Return available direct message contacts strictly enforcing role permissions:
    - Freelancer: ONLY Admin, none else.
    - Team Lead: Admin, EACH member from their own pod, and their own assigned clients.
    - Team Member: Admin and their own Team Lead (TL) ONLY.
    - Admin: Clients, all Team Leads, all Team Members, BDE members, and Freelancers.
    - BDE: Clients, Admin, and other BDE members.
    - Client: Admin, assigned Team Lead, and BDE.
    """
    contacts: list[dict[str, Any]] = []
    current_user_id = actor.user_id

    current_user = await db.get(User, current_user_id)
    raw_role = current_user.role if current_user else actor.role
    user_role = str(raw_role).lower()

    is_admin = user_role in ("admin", "super_admin", "ops_admin")
    is_freelancer = user_role in ("freelancer", "freelance")
    is_tl = user_role in ("team_lead", "lead")
    is_client = user_role in ("client",)
    is_bde = user_role in ("sales", "bde")
    is_team_member = not (is_admin or is_freelancer or is_tl or is_client or is_bde)

    from app.models.work import ClientAssignment

    # 1. Fetch Super Admin & Workspace Admins for non-admins
    admins: list[User] = []
    if not is_admin:
        admin_stmt = (
            select(User)
            .where(User.role.in_([UserRole.SUPER_ADMIN, "super_admin", UserRole.ADMIN, "admin"]))
            .order_by(User.created_at.asc())
        )
        admin_res = await db.execute(admin_stmt)
        admins = list(admin_res.scalars().all())

    # --- RULE 1: FREELANCER -> ONLY ADMIN, NONE ELSE ---
    if is_freelancer:
        for adm in admins:
            if adm.id != current_user_id:
                contacts.append({
                    "id": str(adm.id),
                    "name": adm.full_name or "Creo Admin",
                    "email": adm.email,
                    "role": "Super Admin & Executive Support" if str(adm.role).lower() in ("super_admin",) else "Workspace Admin",
                    "is_super_admin": str(adm.role).lower() in ("super_admin",),
                    "online": True,
                })
        return contacts

    # --- RULE 2: CLIENT -> ONLY ADMIN AND ASSIGNED POD LEAD & BDE ---
    if is_client:
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
        return contacts

    # --- RULE 3: TEAM LEAD -> ADMIN + EACH MEMBER FROM THEIR OWN POD + THEIR OWN CLIENTS ---
    if is_tl:
        # A. Admins
        for adm in admins:
            if adm.id != current_user_id:
                contacts.append({
                    "id": str(adm.id),
                    "name": adm.full_name or "Creo Admin",
                    "email": adm.email,
                    "role": "Super Admin & Executive Support" if str(adm.role).lower() in ("super_admin",) else "Workspace Admin",
                    "is_super_admin": str(adm.role).lower() in ("super_admin",),
                    "online": True,
                })

        # B. Each member from their own pod
        pod_info = await _get_user_pod_info(current_user_id, db)
        member_ids = pod_info.get("member_ids", set())
        if member_ids:
            mem_stmt = select(User).where(User.id.in_(member_ids)).order_by(User.full_name.asc())
            for mu in (await db.execute(mem_stmt)).scalars().all():
                role_label = "Pod Specialist"
                r = str(mu.role).lower()
                if "editor" in r:
                    role_label = "Lead Video Editor"
                elif "design" in r:
                    role_label = "Lead Graphic Designer"
                contacts.append({
                    "id": str(mu.id),
                    "name": mu.full_name or mu.email.split("@")[0].capitalize(),
                    "email": mu.email,
                    "role": f"{role_label} ({pod_info.get('team_name', 'Pod')})",
                    "online": True,
                })

        # C. Their own assigned clients ONLY
        assigned_client_stmt = (
            select(User)
            .join(ClientAssignment, ClientAssignment.client_id == User.id)
            .where(ClientAssignment.user_id == current_user_id, ClientAssignment.role == "team_lead")
            .order_by(User.full_name.asc())
        )
        for cu in (await db.execute(assigned_client_stmt)).scalars().all():
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

    # --- RULE 4: TEAM MEMBER -> ADMIN + THEIR OWN TEAM LEAD ONLY ---
    if is_team_member:
        # A. Admins
        for adm in admins:
            if adm.id != current_user_id:
                contacts.append({
                    "id": str(adm.id),
                    "name": adm.full_name or "Creo Admin",
                    "email": adm.email,
                    "role": "Super Admin & Executive Support" if str(adm.role).lower() in ("super_admin",) else "Workspace Admin",
                    "is_super_admin": str(adm.role).lower() in ("super_admin",),
                    "online": True,
                })

        # B. Their own Team Lead
        pod_info = await _get_user_pod_info(current_user_id, db)
        lead_id = pod_info.get("lead_id")
        if lead_id:
            lead_user = await db.get(User, lead_id)
            if lead_user and lead_user.id != current_user_id:
                contacts.append({
                    "id": str(lead_user.id),
                    "name": lead_user.full_name or "Pod Team Lead",
                    "email": lead_user.email,
                    "role": f"Team Lead ({pod_info.get('team_name', 'Pod')})",
                    "online": True,
                })
        return contacts

    # --- RULE 5: ADMIN -> ALL TEAM LEADS, ALL TEAM MEMBERS, BDE MEMBERS, CLIENTS, FREELANCERS ---
    if is_admin:
        # A. All Team Leads
        tl_stmt = select(User).where(User.role.in_([UserRole.TEAM_LEAD, "team_lead", "lead"])).order_by(User.full_name.asc())
        for tu in (await db.execute(tl_stmt)).scalars().all():
            if tu.id != current_user_id:
                contacts.append({
                    "id": str(tu.id),
                    "name": tu.full_name or tu.email.split("@")[0].capitalize(),
                    "email": tu.email,
                    "role": "Team Lead & Account Director",
                    "online": True,
                })

        # B. All Team Members (Specialists across all pods)
        tm_roles = ["editor", "video_editor", "designer", "graphic_designer", "copywriter", "specialist"]
        tm_stmt = select(User).where(User.role.in_(tm_roles)).order_by(User.full_name.asc())
        for mu in (await db.execute(tm_stmt)).scalars().all():
            if mu.id != current_user_id:
                contacts.append({
                    "id": str(mu.id),
                    "name": mu.full_name or mu.email.split("@")[0].capitalize(),
                    "email": mu.email,
                    "role": f"Specialist ({str(mu.role).replace('_', ' ').title()})",
                    "online": True,
                })

        # C. All BDE Specialists
        bde_stmt = select(User).where(User.role.in_([UserRole.SALES, "sales", "bde"])).where(User.id != current_user_id).order_by(User.full_name.asc())
        for bu in (await db.execute(bde_stmt)).scalars().all():
            contacts.append({
                "id": str(bu.id),
                "name": bu.full_name or bu.email.split("@")[0].capitalize(),
                "email": bu.email,
                "role": "BDE Specialist",
                "is_bde": True,
                "online": True,
            })

        # D. All Clients
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

        # E. All Freelancers
        free_stmt = select(User).where(User.role.in_(["freelancer", "freelance"])).order_by(User.full_name.asc())
        for fu in (await db.execute(free_stmt)).scalars().all():
            if fu.id != current_user_id:
                contacts.append({
                    "id": str(fu.id),
                    "name": fu.full_name or fu.email.split("@")[0],
                    "email": fu.email,
                    "role": "Freelancer",
                    "online": True,
                })

        return contacts

    # --- RULE 6: BDE -> ONLY CLIENTS, ADMINS, AND OTHER BDE MEMBERS ---
    if is_bde:
        # A. Admins
        for adm in admins:
            if adm.id != current_user_id:
                contacts.append({
                    "id": str(adm.id),
                    "name": adm.full_name or "Creo Admin",
                    "email": adm.email,
                    "role": "Super Admin & Executive Support" if str(adm.role).lower() in ("super_admin",) else "Workspace Admin",
                    "is_super_admin": str(adm.role).lower() in ("super_admin",),
                    "online": True,
                })

        # B. All Clients
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

        # C. Other BDE Members
        bde_stmt = select(User).where(User.role.in_([UserRole.SALES, "sales", "bde"])).where(User.id != current_user_id).order_by(User.full_name.asc())
        for bu in (await db.execute(bde_stmt)).scalars().all():
            contacts.append({
                "id": str(bu.id),
                "name": bu.full_name or bu.email.split("@")[0].capitalize(),
                "email": bu.email,
                "role": "BDE Specialist",
                "is_bde": True,
                "online": True,
            })
        return contacts

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
        user_role_str = str(actor.role).lower()
        is_client_user = user_role_str in ("client",)
        is_freelancer_user = user_role_str in ("freelancer", "freelance")
        is_admin_user = user_role_str in ("admin", "super_admin", "ops_admin")
        is_tl_user = user_role_str in ("team_lead", "lead")
        is_tm_user = not (is_admin_user or is_freelancer_user or is_tl_user or is_client_user or user_role_str in ("sales", "bde"))

        if is_freelancer_user:
            return []

        if is_client_user and _is_staff_channel(channel):
            return []

        if not is_admin_user and channel:
            if is_tm_user:
                if channel == "all-pod-leads" or channel == "bde-sales-hub":
                    return []
                if channel.startswith("pod-") and channel.endswith("-team"):
                    pod_info = await _get_user_pod_info(actor.user_id, db)
                    if channel != pod_info.get("channel_slug"):
                        return []
            elif is_tl_user:
                if channel == "bde-sales-hub":
                    return []
                if channel.startswith("pod-") and channel.endswith("-team"):
                    pod_info = await _get_user_pod_info(actor.user_id, db)
                    if channel != pod_info.get("channel_slug"):
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
            "attachment_url": m.attachment_url,
            "attachment_name": m.attachment_name,
            "attachment_type": m.attachment_type,
            "attachment_size": m.attachment_size,
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
    if not payload.message.strip() and not payload.attachment_url:
        raise HTTPException(status_code=400, detail="Message or attachment is required")
    await _require_completed_onboarding(actor, db)

    sender_user = await db.get(User, current_user_id)
    sender_name = sender_user.full_name or "Someone" if sender_user else "Someone"
    sender_role = str(sender_user.role if sender_user else actor.role).lower()

    is_sender_admin = sender_role in ("admin", "super_admin", "ops_admin")
    is_sender_freelancer = sender_role in ("freelancer", "freelance")
    is_sender_tl = sender_role in ("team_lead", "lead")
    is_sender_client = sender_role in ("client",)
    is_sender_bde = sender_role in ("sales", "bde")
    is_sender_tm = not (is_sender_admin or is_sender_freelancer or is_sender_tl or is_sender_client or is_sender_bde)

    websocket_recipients: set[Any] = {current_user_id}

    if payload.channel:
        if is_sender_freelancer:
            raise HTTPException(
                status_code=403,
                detail="Freelancers can only message Workspace Administrators directly.",
            )

        # Enforce channel permissions:
        # Client can ONLY post in their dedicated client pod channel (#pod-creative-hub or client-*)
        if is_sender_client and (
            _is_staff_channel(payload.channel) or payload.channel == "pod-team-chat"
        ):
            raise HTTPException(
                status_code=403,
                detail="Clients can only message in their dedicated Pod Hub channel (#pod-creative-hub)."
            )

        if is_sender_bde and payload.channel not in ("bde-sales-hub", "general"):
            raise HTTPException(
                status_code=403,
                detail="BDE representatives can only post in #bde-sales-hub and #general channels.",
            )

        if not is_sender_admin:
            if is_sender_tm:
                if payload.channel in ("all-pod-leads", "bde-sales-hub"):
                    raise HTTPException(status_code=403, detail="Unauthorized channel access.")
                if payload.channel.startswith("pod-") and payload.channel.endswith("-team"):
                    pod_info = await _get_user_pod_info(current_user_id, db)
                    if payload.channel != pod_info.get("channel_slug"):
                        raise HTTPException(status_code=403, detail="You can only message in your own Pod's team channel.")
            elif is_sender_tl:
                if payload.channel == "bde-sales-hub":
                    raise HTTPException(status_code=403, detail="Unauthorized channel access.")
                if payload.channel.startswith("pod-") and payload.channel.endswith("-team"):
                    pod_info = await _get_user_pod_info(current_user_id, db)
                    if payload.channel != pod_info.get("channel_slug"):
                        raise HTTPException(status_code=403, detail="Team Leads can only message in their own Pod's team channel.")

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
            message=payload.message or (payload.attachment_name or "Attachment"),
            thread_type=payload.channel,
            attachment_url=payload.attachment_url,
            attachment_name=payload.attachment_name,
            attachment_type=payload.attachment_type,
            attachment_size=payload.attachment_size,
        )
        db.add(new_msg)

        # Broadcast live channel messages to all connected active connections as well as relevant recipients
        websocket_recipients = set(ws_manager.active_connections.keys()) | {current_user_id}
        recipients.discard(current_user_id)
        websocket_recipients.update(recipients)

        for recipient_id in recipients:
            notification = Notification(
                user_id=recipient_id,
                title=f"New message from {sender_name} in #{payload.channel}",
                message=payload.message[:100] + ("..." if len(payload.message) > 100 else ""),
                link=f"/slack?channel={payload.channel}"
                if is_client_user
                else f"/portal/slack?channel={payload.channel}",
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
        is_target_bde = target_role in ("sales", "bde")
        is_target_tm = not (is_target_admin or is_target_tl or is_target_client or is_target_bde)

        # STRICT ROLE AUTHORIZATION RULES:
        # RULE 1: CLIENT CAN MESSAGE TL, ADMIN, AND BDE
        if is_sender_client:
            if not (is_target_admin or is_target_tl or is_target_bde):
                raise HTTPException(
                    status_code=403,
                    detail="Clients are only permitted to message Team Leads, Administrators, and BDE Specialists."
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

        # RULE 4: ADMIN CAN MESSAGE ANYONE (LEADS, CLIENTS, SPECIALISTS, BDE, FREELANCERS)
        elif is_sender_admin:
            if target_user.id == current_user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot direct message yourself."
                )

        # RULE 5: BDE CAN ONLY MESSAGE CLIENTS, ADMINS, AND OTHER BDE MEMBERS
        elif is_sender_bde:
            if not (is_target_client or is_target_admin or is_target_bde):
                raise HTTPException(
                    status_code=403,
                    detail="BDE representatives are only permitted to message Clients, Administrators, and other BDE members."
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
            message=payload.message or (payload.attachment_name or "Attachment"),
            thread_type="direct",
            attachment_url=payload.attachment_url,
            attachment_name=payload.attachment_name,
            attachment_type=payload.attachment_type,
            attachment_size=payload.attachment_size,
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
        "attachment_url": new_msg.attachment_url,
        "attachment_name": new_msg.attachment_name,
        "attachment_type": new_msg.attachment_type,
        "attachment_size": new_msg.attachment_size,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
    }

    # Dispatch live updates only to participants of this specific thread.
    await ws_manager.broadcast_new_message(response_data, websocket_recipients)

    return response_data
