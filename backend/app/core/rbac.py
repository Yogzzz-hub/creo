"""Role-Based Access Control (RBAC) and actor permissions foundation.

Allows upfront role validation across all domains without waiting for OAuth/OTP flows.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, Header, Request

from app.core.cache import is_user_suspended_in_cache
from app.core.errors import Forbidden, Unauthorized
from app.models.enums import UserRole


@dataclass(frozen=True)
class Actor:
    """Current authenticated actor."""

    user_id: uuid.UUID
    role: UserRole
    client_id: uuid.UUID | None = None
    email: str | None = None


async def get_current_actor(
    request: Request,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_user_role: str | None = Header(None, alias="X-User-Role"),
    x_client_id: str | None = Header(None, alias="X-Client-Id"),
) -> Actor:
    """Extract actor and role from real JWT Bearer token, falling back to headers."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token and not token.startswith("jwt-"):
            from app.core.security import decode_token

            payload = decode_token(token)
            actor_id = uuid.UUID(payload["sub"])
            if await is_user_suspended_in_cache(actor_id):
                raise Unauthorized("User account has been suspended", code="ACCOUNT_SUSPENDED")

            role_str = payload.get("role", "client").lower()
            try:
                role = UserRole(role_str)
            except ValueError:
                role = UserRole.CLIENT

            client_uuid = None
            if payload.get("client_id"):
                try:
                    client_uuid = uuid.UUID(payload["client_id"])
                except ValueError:
                    pass
            elif role == UserRole.CLIENT:
                client_uuid = actor_id

            return Actor(
                user_id=actor_id,
                role=role,
                client_id=client_uuid,
                email=payload.get("email"),
            )

    actor_id: uuid.UUID
    if x_user_id:
        try:
            actor_id = uuid.UUID(x_user_id)
        except ValueError:
            actor_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    else:
        actor_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Check instant suspension / revocation
    if x_user_id and await is_user_suspended_in_cache(actor_id):
        raise Unauthorized("User account has been suspended", code="ACCOUNT_SUSPENDED")

    role: UserRole
    if x_user_role:
        try:
            role = UserRole(x_user_role.lower())
        except ValueError as err:
            raise Forbidden(f"Invalid user role: {x_user_role}", code="INVALID_ROLE") from err
    else:
        role = UserRole.SUPER_ADMIN

    client_uuid: uuid.UUID | None = None
    if x_client_id:
        try:
            client_uuid = uuid.UUID(x_client_id)
        except ValueError:
            pass
    elif role == UserRole.CLIENT:
        client_uuid = actor_id

    return Actor(user_id=actor_id, role=role, client_id=client_uuid)


def require_roles(*allowed_roles: UserRole) -> Callable[[Actor], Actor]:
    """Dependency factory enforcing role membership."""

    def role_checker(actor: Actor = Depends(get_current_actor)) -> Actor:
        if actor.role not in allowed_roles and actor.role != UserRole.SUPER_ADMIN:
            allowed_names = [r.value for r in allowed_roles]
            raise Forbidden(
                f"Role '{actor.role}' is not authorized. Allowed: {allowed_names}",
                code="FORBIDDEN_ROLE",
                details={"role": actor.role.value, "allowed": allowed_names},
            )
        return actor

    return role_checker


# Convenient role-level dependency aliases
ClientActor = Depends(require_roles(UserRole.CLIENT))
StaffActor = Depends(
    require_roles(
        UserRole.EDITOR,
        UserRole.DESIGNER,
        UserRole.TEAM_LEAD,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    )
)
TeamLeadActor = Depends(require_roles(UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN))
AdminActor = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN))
SuperAdminActor = Depends(require_roles(UserRole.SUPER_ADMIN))
