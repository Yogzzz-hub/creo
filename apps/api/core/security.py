from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.enums import UserRole
from models.user import User

oauth2_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"]
        )
        auth_id: str | None = payload.get("sub")
        if auth_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.auth_id == auth_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if user.deleted_at is not None:
        raise credentials_exception

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    async def role_checker(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' is not authorized to access this resource",
            )
        return current_user
    return role_checker


require_client = require_role(UserRole.client)
require_team_member = require_role(UserRole.team_member, UserRole.team_lead)
require_team_lead = require_role(UserRole.team_lead)
require_sales = require_role(UserRole.sales)
require_admin = require_role(UserRole.admin, UserRole.super_admin)
require_super_admin = require_role(UserRole.super_admin)
require_investor_relations = require_role(UserRole.investor_relations)
require_admin_or_kpi = require_role(UserRole.admin, UserRole.super_admin, UserRole.team_lead, UserRole.investor_relations)

RequireClient = Annotated[User, Depends(require_client)]
RequireTeamMember = Annotated[User, Depends(require_team_member)]
RequireTeamLead = Annotated[User, Depends(require_team_lead)]
RequireSales = Annotated[User, Depends(require_sales)]
RequireAdmin = Annotated[User, Depends(require_admin)]
RequireSuperAdmin = Annotated[User, Depends(require_super_admin)]
RequireInvestorRelations = Annotated[User, Depends(require_investor_relations)]
RequireAdminOrKpi = Annotated[User, Depends(require_admin_or_kpi)]
