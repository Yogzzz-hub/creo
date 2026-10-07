"""Server-side ownership checks for client workspaces."""
from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import Forbidden, NotFound
from app.core.rbac import Actor
from app.models.enums import UserRole
from app.models.user import User
from app.models.work import ClientAssignment

async def ensure_client_access(db: AsyncSession, actor: Actor, client_id: uuid.UUID,
                               *, write: bool = False, allow_client: bool = True) -> None:
    if actor.role == UserRole.CLIENT:
        if not allow_client or client_id != (actor.client_id or actor.user_id):
            raise Forbidden("This client workspace is outside your scope", code="CLIENT_FORBIDDEN")
        return
    staff = {UserRole.TEAM_LEAD, UserRole.EDITOR, UserRole.DESIGNER}
    if actor.role not in staff | {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        raise Forbidden("Role cannot access client production", code="CLIENT_FORBIDDEN")
    if write and actor.role in {UserRole.EDITOR, UserRole.DESIGNER}:
        raise Forbidden("Calendar changes require the client, team lead or admin", code="CLIENT_FORBIDDEN")
    client = await db.get(User, client_id)
    if client is None or client.role != UserRole.CLIENT:
        raise NotFound("Client not found", code="CLIENT_NOT_FOUND")
    if actor.role == UserRole.SUPER_ADMIN:
        return
    if client.agency_id != actor.agency_id:
        raise Forbidden("Client belongs to another agency", code="CLIENT_FORBIDDEN")
    if actor.role == UserRole.ADMIN:
        return
    assigned = (await db.execute(select(ClientAssignment.id).where(
        ClientAssignment.client_id == client_id, ClientAssignment.user_id == actor.user_id
    ).limit(1))).scalar_one_or_none()
    if assigned is None:
        raise Forbidden("Client is not assigned to your pod", code="CLIENT_FORBIDDEN")
