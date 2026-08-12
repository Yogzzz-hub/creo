import time
import hashlib
import logging
from typing import Annotated

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
    try:
        # pyrefly: ignore [missing-import]
        import redis

        r = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

        revoked = r.exists(
            f"revoked_token:{jti}"
        )

        r.close()

        return bool(revoked)

    except Exception:
        return False


def _get_cached_auth_id(jti: str) -> str | None:
    try:
        import redis

        r = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

        auth_id = r.get(f"valid_token:{jti}")

        r.close()

        return auth_id
    except Exception:
        return None


def _cache_auth_id(jti: str, auth_id: str, ttl: int) -> None:
    try:
        import redis

        r = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

        r.setex(f"valid_token:{jti}", ttl, auth_id)

        r.close()
    except Exception:
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

    # 3. Check cache
    auth_id = None
    if jti:
        auth_id = _get_cached_auth_id(jti)

    # 4. Verify token using Supabase if not cached
    if not auth_id:
        supabase = _get_supabase_client()

        # Temporary diagnostic logging.
        logger.info(
            "Verifying Supabase token. token_length=%d",
            len(token),
        )

        try:
            user_response = supabase.auth.get_user(token)

        except Exception as exc:
            # Use logger.exception() so the complete traceback
            # and the real Supabase error are visible.
            logger.exception(
                "Supabase token verification failed: %s",
                exc,
            )
            raise credentials_exception

        if not user_response or not user_response.user:
            logger.warning(
                "Supabase returned no user for the provided token."
            )
            raise credentials_exception

        auth_id = user_response.user.id

        logger.debug(
            "Token verified via Supabase. auth_id=%s",
            auth_id,
        )

        # Cache the valid token until it expires
        if jti and exp:
            ttl = max(60, int(exp) - int(time.time()))
            _cache_auth_id(jti, auth_id, ttl)



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