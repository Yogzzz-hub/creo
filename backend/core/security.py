import time
import hashlib
import logging
from typing import Annotated

import redis
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from supabase import create_client
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.enums import AccountStatus, UserRole
from models.user import User

logger = logging.getLogger(__name__)

oauth2_scheme = HTTPBearer()

_supabase_client = None
_supabase_key_hash: str | None = None

# Global Redis connection pool with fast 0.5s timeouts so absent/offline Redis never blocks API calls.
_redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    max_connections=20,
    socket_connect_timeout=0.5,
    socket_timeout=0.5,
)
_redis_client = redis.Redis(connection_pool=_redis_pool)

_redis_available = True
_last_redis_check = 0.0


def _is_redis_available() -> bool:
    global _redis_available, _last_redis_check
    now = time.time()
    # If previously offline, back off and only retry ping every 30 seconds
    if not _redis_available and (now - _last_redis_check < 30.0):
        return False
    _last_redis_check = now
    try:
        _redis_client.ping()
        _redis_available = True
        return True
    except Exception:
        _redis_available = False
        return False


def _get_supabase_client():
    global _supabase_client, _supabase_key_hash

    current_url = settings.SUPABASE_URL
    current_key = settings.SUPABASE_SERVICE_ROLE_KEY

    key_hash = hashlib.sha256(
        f"{current_url}:{current_key}".encode()
    ).hexdigest()

    if _supabase_client is None or _supabase_key_hash != key_hash:
        _supabase_client = create_client(
            current_url,
            current_key,
        )
        _supabase_key_hash = key_hash

    return _supabase_client


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
        raise RuntimeError(
            "ENCRYPTION_KEY is not set in environment"
        )

    key_hash = hashlib.sha256(
        current_key.encode()
        if isinstance(current_key, str)
        else current_key
    ).hexdigest()

    if _fernet is None or _fernet_key_hash != key_hash:
        _fernet = Fernet(
            current_key.encode()
            if isinstance(current_key, str)
            else current_key
        )
        _fernet_key_hash = key_hash

    return _fernet


def encrypt_token(token: str) -> str:
    fernet = _get_fernet()
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    fernet = _get_fernet()
    return fernet.decrypt(encrypted_token.encode()).decode()


def encrypt_gateway_id(
    gateway_id: str | None,
) -> str | None:
    if not gateway_id:
        return None

    return encrypt_token(gateway_id)


def decrypt_gateway_id(
    encrypted_id: str | None,
) -> str | None:
    if not encrypted_id:
        return None

    try:
        return decrypt_token(encrypted_id)
    except Exception:
        return encrypted_id


def _is_jti_revoked(jti: str) -> bool:
    if not _is_redis_available():
        return False
    try:
        revoked = _redis_client.exists(f"revoked_token:{jti}")
        return bool(revoked)
    except Exception as exc:
        logger.debug("Redis error checking JTI revocation: %s", exc)
        return False


_in_memory_auth_cache: dict[str, tuple[str, float]] = {}


def _get_cached_auth_id(token_key: str) -> str | None:
    now = time.time()
    if token_key in _in_memory_auth_cache:
        auth_id, exp_time = _in_memory_auth_cache[token_key]
        if now < exp_time:
            return auth_id
        else:
            _in_memory_auth_cache.pop(token_key, None)

    if not _is_redis_available():
        return None
    try:
        return _redis_client.get(f"valid_token:{token_key}")
    except Exception as exc:
        logger.debug("Redis error getting cached JTI auth ID: %s", exc)
        return None


def _cache_auth_id(token_key: str, auth_id: str, ttl: int) -> None:
    now = time.time()
    _in_memory_auth_cache[token_key] = (auth_id, now + ttl)

    # Clean stale cache entries if dictionary grows large
    if len(_in_memory_auth_cache) > 2000:
        stale_keys = [k for k, (_, exp_time) in _in_memory_auth_cache.items() if now >= exp_time]
        for k in stale_keys:
            _in_memory_auth_cache.pop(k, None)

    if not _is_redis_available():
        return
    try:
        _redis_client.setex(f"valid_token:{token_key}", ttl, auth_id)
    except Exception as exc:
        logger.debug("Redis error caching JTI auth ID: %s", exc)
        pass


async def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials,
        Depends(oauth2_scheme),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> User:

    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error_code": "token_invalid",
            "message": "Could not validate credentials",
        },
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    # 1. Extract token claims early for caching
    try:
        unverified = jwt.get_unverified_claims(token)

        jti = unverified.get("jti")
        issued_at = unverified.get("iat")
        exp = unverified.get("exp")

    except Exception:
        jti = None
        issued_at = None
        exp = None

    # 2. Check token revocation
    if jti and _is_jti_revoked(jti):
        logger.warning(
            "Token is revoked (jti=%s found in Redis blocklist).",
            jti,
        )
        raise credentials_exception

    token_key = jti or hashlib.sha256(token.encode()).hexdigest()[:32]

    # 3. Check cache (0ms instant lookup)
    auth_id = _get_cached_auth_id(token_key)

    # 4. Verify token: prioritize local cryptographic verification (0ms) over external HTTP calls
    if not auth_id:
        jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        if jwt_secret:
            try:
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False, "verify_sub": True},
                )
                auth_id = payload.get("sub")
            except jwt.ExpiredSignatureError:
                raise credentials_exception
            except Exception as jwt_err:
                logger.debug("Local JWT verification fallback needed: %s", jwt_err)
                auth_id = None

        # If local verification was not configured or secret differed, fallback to Supabase SDK
        if not auth_id:
            try:
                supabase = _get_supabase_client()
                user_response = supabase.auth.get_user(token)
                if not user_response or not user_response.user:
                    raise credentials_exception
                auth_id = user_response.user.id
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("Supabase token verification failed: %s", exc)
                raise credentials_exception

        # Cache the valid token in memory + Redis (up to 5 minutes)
        if auth_id:
            ttl = min(max(60, int(exp) - int(time.time())), 300) if exp else 300
            _cache_auth_id(token_key, auth_id, ttl)



    # 4. Look up local user
    result = await db.execute(
        select(User).where(
            User.auth_id == auth_id
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        logger.warning(
            "No user found in DB for auth_id=%s.",
            auth_id,
        )
        raise credentials_exception

    if user.deleted_at is not None:
        logger.warning(
            "User auth_id=%s has been soft-deleted.",
            auth_id,
        )
        raise credentials_exception

    # Lapsed accounts are blocked globally
    if user.account_status == AccountStatus.lapsed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "account_lapsed",
                "message": (
                    "Your subscription has lapsed. "
                    "Renew to restore full access."
                ),
            },
        )

    # Suspended accounts are blocked globally
    if user.account_status == AccountStatus.suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "account_suspended",
                "message": (
                    "Your account has been suspended. "
                    "Please contact support."
                ),
            },
        )

    # 5. Session timeout
    if issued_at is not None:
        max_age = SESSION_TIMEOUT_SECONDS.get(
            user.role,
            8 * 3600,
        )

        token_age = int(time.time()) - issued_at

        if token_age > max_age:
            logger.warning(
                "Token expired. age=%ds, max_age=%ds, role=%s",
                token_age,
                max_age,
                user.role.value,
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": "session_expired",
                    "message": (
                        "Session expired. "
                        "Please sign in again."
                    ),
                },
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

    logger.debug(
        "Auth successful for user auth_id=%s role=%s",
        auth_id,
        user.role.value,
    )

    return user


CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]


def require_role(*roles: UserRole):
    async def role_checker(
        current_user: CurrentUser,
    ) -> User:

        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{current_user.role.value}' "
                    "is not authorized to access this resource"
                ),
            )

        return current_user

    return role_checker


# Role-based access

require_client = require_role(
    UserRole.client
)

require_team_member = require_role(
    UserRole.team_member,
    UserRole.team_lead,
)

require_team_lead = require_role(
    UserRole.team_lead,
)

require_sales = require_role(
    UserRole.sales,
)

require_admin = require_role(
    UserRole.admin,
    UserRole.super_admin,
)

require_super_admin = require_role(
    UserRole.super_admin,
)

require_investor_relations = require_role(
    UserRole.investor_relations,
)

require_admin_or_kpi = require_role(
    UserRole.admin,
    UserRole.super_admin,
    UserRole.team_lead,
    UserRole.investor_relations,
)


# Active client access
# Used for pages/features that require completed onboarding.

async def require_active_client(
    current_user: CurrentUser,
) -> User:

    if current_user.role != UserRole.client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{current_user.role.value}' "
                "is not authorized to access this resource"
            ),
        )

    if current_user.account_status != AccountStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "onboarding_required",
                "error_code": "pending_onboarding",
                "message": (
                    "Please complete onboarding "
                    "before accessing this resource."
                ),
                "account_status": (
                    current_user.account_status.value
                ),
            },
        )

    return current_user


# Typed dependencies

RequireClient = Annotated[
    User,
    Depends(require_client),
]

RequireActiveClient = Annotated[
    User,
    Depends(require_active_client),
]

RequireTeamMember = Annotated[
    User,
    Depends(require_team_member),
]

RequireTeamLead = Annotated[
    User,
    Depends(require_team_lead),
]

RequireSales = Annotated[
    User,
    Depends(require_sales),
]

RequireAdmin = Annotated[
    User,
    Depends(require_admin),
]

RequireSuperAdmin = Annotated[
    User,
    Depends(require_super_admin),
]

RequireInvestorRelations = Annotated[
    User,
    Depends(require_investor_relations),
]

RequireAdminOrKpi = Annotated[
    User,
    Depends(require_admin_or_kpi),
]


role_router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)


@role_router.get("/me/role")
async def get_my_role(
    current_user: CurrentUser,
):
    return {
        "role": current_user.role.value,
        "account_status": current_user.account_status.value,
        "onboarding_stage": current_user.onboarding_stage,
    }