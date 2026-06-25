import time
import hashlib
from typing import Annotated

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.enums import UserRole
from models.user import User

oauth2_scheme = HTTPBearer()

_fernet: Fernet | None = None
_fernet_key_hash: str | None = None

SESSION_TIMEOUT_SECONDS = {
    UserRole.client: 30 * 24 * 3600,
    UserRole.team_member: 8 * 3600,
    UserRole.team_lead: 8 * 3600,
    UserRole.sales: 8 * 3600,
    UserRole.admin: 4 * 3600,
    UserRole.super_admin: 4 * 3600,
    UserRole.investor_relations: 4 * 3600,
}


def _get_fernet() -> Fernet:
    global _fernet, _fernet_key_hash
    current_key = settings.ENCRYPTION_KEY
    if not current_key:
        raise RuntimeError("ENCRYPTION_KEY is not set in environment")
    key_hash = hashlib.sha256(current_key.encode() if isinstance(current_key, str) else current_key).hexdigest()
    if _fernet is None or _fernet_key_hash != key_hash:
        _fernet = Fernet(current_key.encode() if isinstance(current_key, str) else current_key)
        _fernet_key_hash = key_hash
    return _fernet


def encrypt_token(token: str) -> str:
    fernet = _get_fernet()
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    fernet = _get_fernet()
    return fernet.decrypt(encrypted_token.encode()).decode()


def encrypt_gateway_id(gateway_id: str | None) -> str | None:
    if not gateway_id:
        return None
    return encrypt_token(gateway_id)


def decrypt_gateway_id(encrypted_id: str | None) -> str | None:
    if not encrypted_id:
        return None
    try:
        return decrypt_token(encrypted_id)
    except Exception:
        return encrypted_id


def _is_token_revoked(token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_exp": False})
        jti = payload.get("jti")
        if not jti:
            return False
        import redis
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        revoked = r.exists(f"revoked_token:{jti}")
        r.close()
        return bool(revoked)
    except Exception:
        return False


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
        issued_at: int | None = payload.get("iat")
    except JWTError:
        raise credentials_exception

    if _is_token_revoked(token):
        raise credentials_exception

    result = await db.execute(select(User).where(User.auth_id == auth_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if user.deleted_at is not None:
        raise credentials_exception
    if user.account_status.value in ("lapsed", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active. Please contact support.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if issued_at is not None:
        max_age = SESSION_TIMEOUT_SECONDS.get(user.role, 8 * 3600)
        token_age = int(time.time()) - issued_at
        if token_age > max_age:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

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


role_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@role_router.get("/me/role")
async def get_my_role(current_user: CurrentUser):
    return {
        "role": current_user.role.value,
        "account_status": current_user.account_status.value,
    }
