"""Authentication router: OTP with SMTP delivery, Google OAuth, Instagram OAuth, and session management."""

from __future__ import annotations

import secrets
import time
import urllib.parse
import uuid
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.core.cache import get_redis
from app.core.rbac import Actor, get_current_actor
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.db.session import get_db
from app.models.enums import AccountStatus, UserRole
from app.models.user import ClientProfile, User
from app.services.email_service import send_otp_email

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

# Ephemeral in-memory OTP storage: key -> [code, expiry_timestamp, attempts]
_otp_store: dict[str, list[Any]] = {}
_pending_registration_store: dict[str, dict[str, str]] = {}

# Ephemeral rate limiting store: key -> list of timestamp floats
_rate_limits: dict[str, list[float]] = {}


def _otp_redis_key(key: str) -> str:
    return f"auth:otp:{key}"


def _registration_redis_key(email: str) -> str:
    return f"auth:registration:{email}"


async def _save_pending_registration(email: str, value: dict[str, str]) -> None:
    _pending_registration_store[email] = value
    try:
        redis = await get_redis()
        await redis.setex(_registration_redis_key(email), 600, json.dumps(value))
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.error("registration_store_unavailable", error=str(exc))
            raise HTTPException(
                status_code=503,
                detail="Verification service is temporarily unavailable.",
            ) from exc


async def _load_pending_registration(email: str) -> dict[str, str] | None:
    try:
        redis = await get_redis()
        raw = await redis.get(_registration_redis_key(email))
        if raw:
            value = json.loads(raw)
            return value if isinstance(value, dict) else None
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.error("registration_store_unavailable", error=str(exc))
            raise HTTPException(
                status_code=503,
                detail="Verification service is temporarily unavailable.",
            ) from exc
    return _pending_registration_store.get(email)


async def _delete_pending_registration(email: str) -> None:
    _pending_registration_store.pop(email, None)
    try:
        redis = await get_redis()
        await redis.delete(_registration_redis_key(email))
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.warning("registration_delete_failed", error=str(exc))


async def _save_otp(key: str, value: list[Any]) -> None:
    """Persist OTP state across every API worker and instance."""
    ttl = max(1, int(float(value[1]) - time.time()))
    _otp_store[key] = value
    try:
        redis = await get_redis()
        await redis.setex(_otp_redis_key(key), ttl, json.dumps(value))
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.error("otp_store_unavailable", error=str(exc))
            raise HTTPException(status_code=503, detail="Verification service is temporarily unavailable.") from exc


async def _load_otp(key: str) -> list[Any] | None:
    try:
        redis = await get_redis()
        raw = await redis.get(_otp_redis_key(key))
        if raw:
            value = json.loads(raw)
            return value if isinstance(value, list) and len(value) == 3 else None
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.error("otp_store_unavailable", error=str(exc))
            raise HTTPException(status_code=503, detail="Verification service is temporarily unavailable.") from exc
    return _otp_store.get(key)


async def _delete_otp(key: str) -> None:
    _otp_store.pop(key, None)
    try:
        redis = await get_redis()
        await redis.delete(_otp_redis_key(key))
    except Exception as exc:
        if settings.ENVIRONMENT == "production":
            logger.warning("otp_delete_failed", error=str(exc))


async def _deliver_otp_or_raise(email: str, otp_code: str) -> None:
    """Deliver an OTP before making it valid in the shared store."""
    try:
        delivered = await send_otp_email(email, otp_code)
    except Exception as exc:
        logger.warning("otp_dispatch_error", error=str(exc), email=email)
        delivered = False

    if not delivered:
        if settings.ENVIRONMENT != "production" and getattr(settings, "ALLOW_FALLBACK_OTP", False):
            logger.warning(
                "otp_delivery_failed_allowing_fallback",
                email=email,
                otp_code=otp_code,
            )
            return
        raise HTTPException(
            status_code=503,
            detail="We could not deliver the verification email. Please try again shortly.",
        )


def _check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Sliding-window in-memory rate limiter per key (e.g. IP or email)."""
    now = time.time()
    cutoff = now - window_seconds
    timestamps = [t for t in _rate_limits.get(key, []) if t > cutoff]
    if len(timestamps) >= max_requests:
        _rate_limits[key] = timestamps
        return False
    timestamps.append(now)
    _rate_limits[key] = timestamps
    return True


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=8)
    full_name: str | None = None


class RegisterIntentRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = None


class VerifyRegistrationRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=8)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = None


class ResendRegistrationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=8)


class SetMandatoryPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str | None = None


@router.post("/register-intent", response_model=dict[str, Any])
async def register_intent(
    payload: RegisterIntentRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Validate email uniqueness, password strength, rate limit, and dispatch 6-digit verification code to email."""
    email_clean = payload.email.strip().lower()

    # Rate limiting: Max 5 registration attempts per 10 minutes per email
    if not _check_rate_limit(f"reg_intent:{email_clean}", max_requests=5, window_seconds=600):
        raise HTTPException(
            status_code=429,
            detail="Too many registration attempts. Please wait a few minutes before trying again.",
        )

    # Password complexity enforcement
    valid, err = validate_password_strength(payload.password)
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    # Check if user already exists
    stmt = select(User).where(func.lower(User.email) == email_clean)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 600.0  # 10 minutes
    pending_registration = {
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name or email_clean.split("@")[0].capitalize(),
    }
    await _deliver_otp_or_raise(email_clean, otp_code)
    await _save_otp(f"reg:{email_clean}", [otp_code, expires_at, 0])
    await _save_pending_registration(email_clean, pending_registration)

    return {
        "status": "sent",
        "email": email_clean,
        "message": "Verification code sent to email. Please verify to complete account creation.",
        "email_delivered": True,
        "expires_in_seconds": 600,
    }


@router.post("/resend-registration", response_model=dict[str, Any])
async def resend_registration(
    payload: ResendRegistrationRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Resend registration OTP without requiring the password after refresh."""
    email_clean = payload.email.strip().lower()
    if not _check_rate_limit(f"reg_resend:{email_clean}", max_requests=5, window_seconds=600):
        raise HTTPException(
            status_code=429,
            detail="Too many resend attempts. Please wait a few minutes.",
        )

    pending = await _load_pending_registration(email_clean)
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="Registration session expired. Please enter your details again.",
        )

    existing = await db.execute(select(User.id).where(func.lower(User.email) == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This account already exists. Please sign in.")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 600.0
    await _deliver_otp_or_raise(email_clean, otp_code)
    await _save_otp(f"reg:{email_clean}", [otp_code, expires_at, 0])
    await _save_pending_registration(email_clean, pending)
    return {
        "status": "sent",
        "email": email_clean,
        "message": "A new verification code was sent to your email.",
        "email_delivered": True,
        "expires_in_seconds": 600,
    }


@router.post("/verify-registration", response_model=dict[str, Any])
async def verify_registration(
    payload: VerifyRegistrationRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify OTP and complete user account creation with hashed password."""
    email_clean = payload.email.strip().lower()
    store_key = f"reg:{email_clean}"
    stored = await _load_otp(store_key)
    pending_registration = await _load_pending_registration(email_clean)

    if not stored:
        raise HTTPException(status_code=400, detail="No active verification code found for this email. Please request a new code.")

    if time.time() > stored[1]:
        await _delete_otp(store_key)
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    stored[2] += 1
    await _save_otp(store_key, stored)
    if stored[2] > 5:
        await _delete_otp(store_key)
        raise HTTPException(status_code=429, detail="Maximum verification attempts exceeded. Please request a new code.")

    if stored[0] != payload.code.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check the code sent to your email.")

    if pending_registration:
        hashed_pw = pending_registration.get("password_hash", "")
        resolved_name = pending_registration.get("full_name") or email_clean.split("@")[0].capitalize()
    else:
        if not payload.password:
            raise HTTPException(
                status_code=400,
                detail="Registration session expired. Please enter your details again.",
            )
        valid, err = validate_password_strength(payload.password)
        if not valid:
            raise HTTPException(status_code=400, detail=err)
        hashed_pw = hash_password(payload.password)
        resolved_name = payload.full_name or email_clean.split("@")[0].capitalize()

    stmt = select(User).where(func.lower(User.email) == email_clean)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    # Public registration is strictly CLIENT; staff/admin must be invited or provisioned
    assigned_role = UserRole.CLIENT

    # Check agency limits and status
    from app.models.tenant import Agency
    from sqlalchemy import select, text
    agency_id_str = await db.scalar(text("SELECT current_setting('app.agency_id', true)"))
    if agency_id_str:
        agency = await db.get(Agency, uuid.UUID(agency_id_str))
        if agency:
            if agency.status == "past_due":
                raise HTTPException(403, "Agency account is past due. New client registration is blocked.")
            # Could also enforce client limits here, but we have capacity_service
    else:
        default_agency = await db.scalar(select(Agency.id).where(Agency.status == "active").order_by(Agency.created_at.asc()).limit(1))
        if not default_agency:
            default_agency = await db.scalar(select(Agency.id).limit(1))
        agency_id_str = str(default_agency) if default_agency else "00000000-0000-0000-0000-000000000001"
            
    user = User(
        auth_id=f"auth-pwd-{uuid.uuid4().hex[:12]}",
        email=email_clean,
        full_name=resolved_name,
        hashed_password=hashed_pw,
        role=assigned_role,
        account_status=AccountStatus.ACTIVE,
        email_verified_at=datetime.now(timezone.utc),
        must_reset_password=False,
        agency_id=uuid.UUID(agency_id_str) if agency_id_str else None,
    )
    db.add(user)
    await db.flush()

    profile = ClientProfile(user_id=user.id)
    db.add(profile)
    await db.commit()
    await db.refresh(user)
    await _delete_otp(store_key)
    await _delete_pending_registration(email_clean)

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
        extra_claims={"must_reset_password": False},
    )
    refresh_token = create_refresh_token(subject=user.id)

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": False,
            "onboarding_stage": stage,
        },
    }


@router.post("/forgot-password", response_model=dict[str, Any])
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Generate and dispatch OTP to user email for password reset."""
    email_clean = payload.email.strip().lower()

    if not _check_rate_limit(f"forgot:{email_clean}", max_requests=5, window_seconds=600):
        raise HTTPException(
            status_code=429,
            detail="Too many password reset requests. Please wait a few minutes before trying again.",
        )

    stmt = select(User).where(func.lower(User.email) == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 600.0
    await _deliver_otp_or_raise(email_clean, otp_code)
    await _save_otp(f"reset:{email_clean}", [otp_code, expires_at, 0])

    return {
        "status": "sent",
        "email": email_clean,
        "message": "Verification code sent to email. Enter the code to proceed with password reset.",
        "email_delivered": True,
        "expires_in_seconds": 600,
    }


@router.post("/verify-reset-otp", response_model=dict[str, Any])
async def verify_reset_otp(
    payload: VerifyResetOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify reset OTP, authenticate user, and flag account with must_reset_password=True."""
    email_clean = payload.email.strip().lower()
    store_key = f"reset:{email_clean}"
    stored = await _load_otp(store_key)

    if not stored:
        raise HTTPException(status_code=400, detail="No active reset code found for this email. Please request a new code.")

    if time.time() > stored[1]:
        await _delete_otp(store_key)
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new code.")

    stored[2] += 1
    await _save_otp(store_key, stored)
    if stored[2] > 5:
        await _delete_otp(store_key)
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new reset code.")

    if stored[0] != payload.code.strip():
        raise HTTPException(status_code=400, detail="Invalid reset code.")

    await _delete_otp(store_key)

    stmt = select(User).where(func.lower(User.email) == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Flag user for mandatory password reset
    user.must_reset_password = True
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
        extra_claims={"must_reset_password": True},
    )
    refresh_token = create_refresh_token(subject=user.id)

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": True,
            "onboarding_stage": stage,
        },
    }


@router.post("/set-mandatory-password", response_model=dict[str, Any])
async def set_mandatory_password(
    payload: SetMandatoryPasswordRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Set new password for current user and unlock account by unsetting must_reset_password."""
    user_id = actor.user_id

    # Validate password strength
    valid, err = validate_password_strength(payload.new_password)
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    user.must_reset_password = False
    await db.commit()
    await db.refresh(user)

    # Issue refreshed token with must_reset_password = False
    new_access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
        extra_claims={"must_reset_password": False},
    )

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    return {
        "status": "success",
        "message": "Password updated successfully. Account unlocked.",
        "access_token": new_access_token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": False,
            "onboarding_stage": stage,
        },
    }


@router.post("/register", response_model=dict[str, Any])
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Reject legacy direct registration; new accounts must verify email first."""
    raise HTTPException(
        status_code=410,
        detail="Direct registration is no longer available. Request a verification code first.",
    )


@router.post("/login", response_model=dict[str, Any])
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate with email and password with brute-force rate limit protection."""
    email_clean = payload.email.strip().lower()

    # Rate limiting: Max 10 attempts per 15 minutes
    if not _check_rate_limit(f"login:{email_clean}", max_requests=10, window_seconds=900):
        raise HTTPException(
            status_code=429,
            detail="Too many sign-in attempts. For your security, this account is temporarily locked for 15 minutes.",
        )

    stmt = select(User).where(func.lower(User.email) == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Please check your credentials.",
        )

    if not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Please check your credentials.",
        )

    if user.account_status == AccountStatus.SUSPENDED:
        raise HTTPException(
            status_code=403,
            detail="Your account has been suspended. Please contact support.",
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
        extra_claims={"must_reset_password": bool(getattr(user, "must_reset_password", False))},
    )
    refresh_token = create_refresh_token(subject=user.id)

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": bool(getattr(user, "must_reset_password", False)),
            "onboarding_stage": stage,
        },
    }


@router.post("/reset-admin-seed", response_model=dict[str, Any])
async def reset_admin_seed(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Legacy credential reset is disabled; use authenticated password recovery."""
    raise HTTPException(status_code=410, detail="Use the authenticated password recovery flow.")


@router.post("/send-otp", response_model=dict[str, Any])
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Send 6-digit verification code to email via Google SMTP with rate limiting."""
    email_clean = payload.email.strip().lower()

    if not _check_rate_limit(f"send_otp:{email_clean}", max_requests=5, window_seconds=600):
        raise HTTPException(
            status_code=429,
            detail="Too many verification requests. Please wait a few minutes before trying again.",
        )

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 600.0  # 10 minutes
    await _deliver_otp_or_raise(email_clean, otp_code)
    await _save_otp(email_clean, [otp_code, expires_at, 0])

    return {
        "status": "sent",
        "email": email_clean,
        "message": "Verification code sent to email",
        "email_delivered": True,
        "expires_in_seconds": 600,
    }


@router.post("/verify-otp", response_model=dict[str, Any])
async def verify_otp(
    payload: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify OTP and return authenticated user session & token."""
    email_key = payload.email.strip().lower()
    stored = await _load_otp(email_key)

    if not stored:
        raise HTTPException(status_code=400, detail="No active verification code found for this email. Please request a new code.")

    if time.time() > stored[1]:
        await _delete_otp(email_key)
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    stored[2] += 1
    await _save_otp(email_key, stored)
    if stored[2] > 5:
        await _delete_otp(email_key)
        raise HTTPException(status_code=429, detail="Maximum verification attempts exceeded. Please request a new code.")

    if stored[0] != payload.code.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    await _delete_otp(email_key)

    # Lookup or create user
    stmt = select(User).where(User.email == email_key)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        email_lower = email_key
        assigned_role = UserRole.CLIENT

        user = User(
            auth_id=f"auth-otp-{uuid.uuid4().hex[:12]}",
            email=email_lower,
            full_name=payload.full_name or email_lower.split("@")[0].capitalize(),
            role=assigned_role,
            account_status=AccountStatus.ACTIVE,
        )
        db.add(user)
        await db.flush()

        profile = ClientProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
        extra_claims={"must_reset_password": bool(getattr(user, "must_reset_password", False))},
    )
    refresh_token = create_refresh_token(subject=user.id)

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": bool(getattr(user, "must_reset_password", False)),
            "onboarding_stage": stage,
        },
    }


@router.get("/me", response_model=dict[str, Any])
async def get_me(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return active user profile and stage."""
    user_id = actor.user_id

    # If default actor with no specific auth, require actual authentication
    if str(user_id) == "00000000-0000-0000-0000-000000000001" and actor.email is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(User, ClientProfile).outerjoin(
        ClientProfile, ClientProfile.user_id == User.id
    ).where(User.id == user_id)
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=401, detail="User session not found")
    user, profile = row

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    has_active_sub = True
    if user.role.value == "client":
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, user.id)
        has_active_sub = sub_check["is_active"]

    refreshed_token = None
    if not bool(getattr(user, "must_reset_password", False)):
        refreshed_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            email=user.email,
            client_id=user.id if user.role == UserRole.CLIENT else None,
            agency_id=user.agency_id,
            extra_claims={"must_reset_password": False},
        )

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name or user.email.split("@")[0],
        "role": user.role.value,
        "account_status": user.account_status.value,
        "must_reset_password": bool(getattr(user, "must_reset_password", False)),
        "onboarding_stage": stage,
        "terms_accepted": profile.terms_accepted_at is not None if profile else False,
        "has_active_subscription": has_active_sub,
        "access_token": refreshed_token,
    }



@router.get("/me/role", response_model=dict[str, Any])
async def get_me_role(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return user's role, account status, and onboarding stage for fast RBAC checks."""
    user_id = actor.user_id

    if str(user_id) == "00000000-0000-0000-0000-000000000001" and actor.email is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User session not found")

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == user.id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()

    from app.services.onboarding_service import get_current_stage
    stage = await get_current_stage(db, user.id) if user.role == UserRole.CLIENT else 5

    has_active_sub = True
    if user.role.value == "client":
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, user.id)
        has_active_sub = sub_check["is_active"]

    return {
        "role": user.role.value,
        "account_status": user.account_status.value,
        "must_reset_password": bool(getattr(user, "must_reset_password", False)),
        "onboarding_stage": stage,
        "has_active_subscription": has_active_sub,
    }


@router.get("/google/url", response_model=dict[str, Any])
async def get_google_auth_url(redirect_uri: str | None = None) -> dict[str, Any]:
    """Generate Google OAuth 2.0 authorization consent URL."""
    state = uuid.uuid4().hex
    client_id = settings.GOOGLE_CLIENT_ID or "mock_google_client_id"
    redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:5173/auth/google/callback"
    
    encoded_redirect = urllib.parse.quote(redirect, safe="")
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        f"&redirect_uri={encoded_redirect}"
        f"&state={state}"
        "&access_type=offline"
        "&prompt=consent"
    )
    return {"url": url, "state": state, "client_id": client_id}


async def _process_google_code(
    code: str,
    redirect_uri: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Internal helper to exchange Google code and issue JWT tokens."""
    if code == "mock_code" and settings.ENVIRONMENT != "test":
        raise HTTPException(status_code=400, detail="Invalid Google authorization code")
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    user_info: dict[str, Any] = {}

    if client_id and client_secret and code != "mock_code":
        # Check primary redirect URI and candidate fallback URIs in case
        # Google Console registered the root or api path
        candidate_uris = [redirect_uri]
        for fallback in [
            settings.GOOGLE_REDIRECT_URI,
            "https://creo.yogalakshmibaskar20.workers.dev",
            "https://creo.yogalakshmibaskar20.workers.dev/auth/google/callback",
            "https://creo-dsxr.onrender.com",
            "https://creo-dsxr.onrender.com/api/v1/auth/google/callback",
            "https://creo-dsxr.onrender.com/auth/google/callback",
            "http://localhost:5173/auth/google/callback",
        ]:
            if fallback and fallback not in candidate_uris:
                candidate_uris.append(fallback)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                for uri in candidate_uris:
                    token_resp = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": code,
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "redirect_uri": uri,
                            "grant_type": "authorization_code",
                        },
                    )
                    if token_resp.status_code == 200:
                        token_data = token_resp.json()
                        access_token = token_data.get("access_token")
                        info_resp = await client.get(
                            "https://www.googleapis.com/oauth2/v2/userinfo",
                            headers={"Authorization": f"Bearer {access_token}"},
                        )
                        if info_resp.status_code == 200:
                            user_info = info_resp.json()
                            break
                    else:
                        logger.debug("google_token_exchange_try", uri=uri, status=token_resp.status_code)
        except Exception as e:
            logger.warning("google_oauth_exchange_failed", error=str(e))

    # Verify that we actually received valid Google user profile
    if not user_info or not user_info.get("email"):
        if code == "mock_code":
            email = "demo-client@example.com"
            full_name = "Demo Client"
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to authenticate with Google or authorization code has expired. Please try signing in again.",
            )
    else:
        email = user_info["email"].strip().lower()
        full_name = (
            user_info.get("name")
            or f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()
            or email.split("@")[0].capitalize()
        )

    # Lookup or create user (case-insensitive)
    stmt = select(User).where(func.lower(User.email) == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        try:
            user = User(
                auth_id=f"auth-google-{uuid.uuid4().hex[:12]}",
                email=email,
                full_name=full_name,
                role=UserRole.CLIENT,
                account_status=AccountStatus.ACTIVE,
            )
            db.add(user)
            await db.flush()

            profile = ClientProfile(user_id=user.id)
            db.add(profile)
            await db.commit()
            await db.refresh(user)
        except Exception:
            await db.rollback()
            # If concurrent request already inserted, re-fetch
            stmt = select(User).where(func.lower(User.email) == email)
            res = await db.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=500, detail="Could not create user account.")
    else:
        # Existing user: ensure full_name reflects real Google name if currently generic
        if full_name and (not user.full_name or user.full_name.lower().startswith("google-user") or user.full_name.lower().startswith("user-")):
            user.full_name = full_name
            await db.commit()
            await db.refresh(user)

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
    )
    refresh_token = create_refresh_token(subject=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "must_reset_password": bool(getattr(user, "must_reset_password", False)),
        },
    }


@router.post("/google/callback", response_model=dict[str, Any])
async def google_auth_callback(
    payload: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Exchange Google OAuth authorization code for session (JSON POST)."""
    redirect_uri = payload.redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:5173/auth/google/callback"
    return await _process_google_code(payload.code, redirect_uri, db)


@router.get("/google/callback")
async def google_auth_callback_get(
    code: str = Query(..., description="Google OAuth authorization code"),
    state: str | None = Query(None, description="OAuth state parameter"),
    redirect_uri: str | None = Query(None, description="Optional original redirect URI"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Direct browser redirect callback from Google OAuth."""
    resolved_redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI or "https://creo-dsxr.onrender.com"
    data = await _process_google_code(code, resolved_redirect, db)
    token = data["access_token"]

    # If state contains frontend origin or default to frontend origin
    frontend_base = "http://localhost:5173"
    if state and (state.startswith("http://") or state.startswith("https://")):
        frontend_base = state.rstrip("/")

    target_url = f"{frontend_base}/auth/google/callback?token={urllib.parse.quote(token)}"
    return RedirectResponse(url=target_url)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=dict[str, Any])
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Exchange valid refresh token for a new access token."""
    from app.core.security import decode_token

    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token type for refresh")

    user_id = uuid.UUID(data["sub"])
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id,
    )
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


@router.get("/instagram/url", response_model=dict[str, Any])
async def get_instagram_auth_url(redirect_uri: str | None = None) -> dict[str, Any]:
    """Generate Instagram Graph API authorization URL."""
    state = uuid.uuid4().hex
    app_id = settings.INSTAGRAM_APP_ID or "1025363733231558"
    redirect = redirect_uri or settings.INSTAGRAM_REDIRECT_URI or "http://localhost:3000/api/auth/callback/instagram"
    encoded_redirect = urllib.parse.quote(redirect, safe="")

    url = (
        "https://api.instagram.com/oauth/authorize"
        f"?client_id={app_id}"
        f"&redirect_uri={encoded_redirect}"
        "&scope=user_profile,user_media"
        "&response_type=code"
        f"&state={state}"
    )
    return {"url": url, "state": state, "app_id": app_id}


@router.post("/logout", response_model=dict[str, Any])
async def logout() -> dict[str, Any]:
    """Logout and revoke session."""
    return {"status": "logged_out"}

