import json
import logging
import time
import secrets
import uuid
from typing import Optional
from datetime import datetime, timezone, timedelta

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from jose import jwt

from core.config import settings
from core.database import get_db
from core.exceptions import limiter
from models.enums import AccountStatus, UserRole
from models.user import User
from schemas.auth import RegisterRequest, RegisterResponse
from services.email import send_otp_email
from workers.notification_tasks import notify_incomplete_signup, send_verification_email_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

REDIS_ABANDONED_CART_PREFIX = "abandoned_cart:"

# In-memory OTP store with expiration fallback
_otp_cache: dict[str, dict] = {}


def _store_otp(email: str, code: str, full_name: Optional[str] = None) -> None:
    norm_email = email.strip().lower()
    expires_at = time.time() + 600  # 10 minutes
    _otp_cache[norm_email] = {"code": code, "expires_at": expires_at, "full_name": full_name}
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.set(f"otp:{norm_email}", json.dumps({"code": code, "full_name": full_name}), ex=600)
        r.close()
    except Exception as exc:
        logger.debug("Redis OTP cache bypassed: %s", exc)


def _get_and_clear_otp(email: str, code: str) -> Optional[dict]:
    norm_email = email.strip().lower()
    stored = None
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        val = r.get(f"otp:{norm_email}")
        if val:
            stored = json.loads(val)
            r.delete(f"otp:{norm_email}")
        r.close()
    except Exception:
        pass

    if not stored and norm_email in _otp_cache:
        item = _otp_cache.get(norm_email)
        if item and item["expires_at"] > time.time():
            stored = item
        _otp_cache.pop(norm_email, None)

    if stored and stored.get("code") == code.strip():
        return stored
    return None


class SendOtpPayload(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class VerifyOtpPayload(BaseModel):
    email: EmailStr
    code: str
    full_name: Optional[str] = None


@router.post("/send-otp")
async def send_otp_endpoint(payload: SendOtpPayload):
    """Generates and sends a 6-digit OTP code to user's email using Google SMTP."""
    code = f"{secrets.randbelow(900000) + 100000}"
    _store_otp(payload.email, code, payload.full_name)
    try:
        await send_otp_email(to_email=payload.email, otp_code=code, name=payload.full_name)
    except Exception as exc:
        logger.exception("Failed to send OTP email via Google SMTP: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please check your email address or try again.",
        )
    return {"status": "ok", "message": "Verification code sent successfully"}


@router.post("/verify-otp")
async def verify_otp_endpoint(payload: VerifyOtpPayload, db: AsyncSession = Depends(get_db)):
    """Verifies the 6-digit OTP code and returns a signed JWT session token."""
    stored = _get_and_clear_otp(payload.email, payload.code)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check and try again.",
        )

    norm_email = payload.email.strip().lower()
    name = payload.full_name or stored.get("full_name") or norm_email.split("@")[0]

    # Find or create user in PostgreSQL
    query = select(User).where(User.email == norm_email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            auth_id=str(uuid.uuid4()),
            email=norm_email,
            full_name=name,
            role=UserRole.client,
            account_status=AccountStatus.pending_verification,
            onboarding_stage=1,
            terms_accepted=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif name and (not user.full_name or user.full_name == norm_email.split("@")[0]):
        user.full_name = name
        await db.commit()
        await db.refresh(user)

    # Issue standard JWT session token signed with SUPABASE_JWT_SECRET
    jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=30)
    claims = {
        "aud": "authenticated",
        "role": user.role.value,
        "sub": str(user.auth_id),
        "email": user.email,
        "name": user.full_name,
        "app_metadata": {
            "provider": "email",
            "providers": ["email"],
        },
        "user_metadata": {
            "role": user.role.value,
            "full_name": user.full_name,
            "name": user.full_name,
            "account_status": user.account_status.value,
            "onboarding_stage": user.onboarding_stage,
        },
        "account_status": user.account_status.value,
        "onboarding_stage": user.onboarding_stage,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    session_token = jwt.encode(claims, jwt_secret, algorithm="HS256")

    return {
        "status": "ok",
        "access_token": session_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.auth_id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "account_status": user.account_status.value,
            "onboarding_stage": user.onboarding_stage,
        },
    }


def _store_task_ids(user_id: str, task_ids: list[str]) -> None:
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        key = f"{REDIS_ABANDONED_CART_PREFIX}{user_id}"
        r.set(key, json.dumps(task_ids), ex=14400)
        r.close()
    except Exception as exc:
        logger.warning("Failed to store abandoned cart task IDs for user %s: %s", user_id, exc)


def revoke_abandoned_cart_tasks(user_id: str) -> None:
    try:
        import redis
        # pyrefly: ignore [missing-import]
        from celery import Celery
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        key = f"{REDIS_ABANDONED_CART_PREFIX}{user_id}"
        task_ids_raw = r.get(key)
        if task_ids_raw:
            task_ids = json.loads(task_ids_raw)
            celery = Celery("creo_worker", broker=settings.CELERY_BROKER_URL)
            for tid in task_ids:
                celery.control.revoke(tid, terminate=True)
            r.delete(key)
            logger.info("Revoked %d abandoned cart tasks for user %s", len(task_ids), user_id)
        r.close()
    except Exception as exc:
        logger.warning("Failed to revoke abandoned cart tasks for user %s: %s", user_id, exc)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.auth_id == payload.auth_id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this auth_id already exists",
        )

    existing_email = await db.execute(select(User).where(User.email == payload.email))
    if existing_email.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    user = User(
        auth_id=payload.auth_id,
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        business_name=payload.business_name,
        role=UserRole.client,
        account_status=AccountStatus.pending_verification,
    )

    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation."
        )
    except Exception:
        await db.rollback()
        logger.exception("Transaction failed during user registration")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed."
        )

    if user.phone:
        checkout_url = f"{settings.FRONTEND_URL}/onboarding/verify"
        task_ids = []
        for countdown in [3600, 7200, 14400]:
            result = notify_incomplete_signup.apply_async(
                args=[user.phone, user.full_name, checkout_url],
                countdown=countdown,
            )
            task_ids.append(result.id)
        _store_task_ids(str(user.id), task_ids)

    return RegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        account_status=user.account_status.value,
    )

#email_verfication_duringOnboarding
@router.post("/module-3-entry/{user_id}")
async def trigger_email_verification(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    Task T5.1: Triggered when a client enters Module 3.
    Bypasses email verification for Google OAuth users (who skip the pending_verification status).
    """
    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Bypass for pre-verified Google OAuth users or already verified accounts
    if user.account_status != AccountStatus.pending_verification:
        return {
            "status": "bypassed", 
            "message": "User is already verified. Proceed to payment."
        }

    # Construct the frontend verification link
    # Note: Using NEXT_PUBLIC_API_URL as placeholder, align with FRONTEND_URL if your config differs
    verification_link = f"{settings.FRONTEND_URL}/onboarding/verify?user={user.id}"
    
    # Trigger the Celery task asynchronously using .delay()
    send_verification_email_task.delay(user.email, verification_link)

    return {
        "status": "verification_sent", 
        "message": "Verification email dispatched successfully."
    }


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Direct Google OAuth Integration
# ---------------------------------------------------------------------------

async def process_google_oauth(
    code: str,
    redirect_uri: str,
    db: AsyncSession,
):
    """
    Exchanges Google authorization code for tokens, creates or finds user in PostgreSQL,
    and returns a JWT token redirecting to the frontend.
    """
    import httpx
    import uuid
    from datetime import datetime, timezone, timedelta
    from jose import jwt
    from fastapi.responses import RedirectResponse

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=token_data)
        if token_res.status_code != 200:
            logger.error("Google token exchange failed (uri=%s): %s", redirect_uri, token_res.text)
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_auth_failed")

        token_json = token_res.json()
        access_token = token_json.get("access_token")

        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_res.status_code != 200:
            logger.error("Google userinfo fetch failed: %s", userinfo_res.text)
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_userinfo_failed")

        userinfo = userinfo_res.json()

    email = userinfo.get("email")
    full_name = userinfo.get("name") or userinfo.get("given_name") or (email.split("@")[0] if email else "User")

    if not email:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=no_email_provided")

    # Check if user exists by email
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        # Create new client user
        user = User(
            auth_id=str(uuid.uuid4()),
            email=email,
            full_name=full_name,
            role=UserRole.client,
            account_status=AccountStatus.pending_verification,
            onboarding_stage=1,
            terms_accepted=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Issue JWT session token signed with SUPABASE_JWT_SECRET or SECRET_KEY
    jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=30)
    claims = {
        "aud": "authenticated",
        "role": user.role.value,
        "sub": str(user.auth_id),
        "email": user.email,
        "name": user.full_name,
        "app_metadata": {
            "provider": "google",
            "providers": ["google"],
        },
        "user_metadata": {
            "role": user.role.value,
            "full_name": user.full_name,
            "name": user.full_name,
            "account_status": user.account_status.value,
            "onboarding_stage": user.onboarding_stage,
        },
        "account_status": user.account_status.value,
        "onboarding_stage": user.onboarding_stage,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    session_token = jwt.encode(claims, jwt_secret, algorithm="HS256")

    # Redirect to frontend callback route with token
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={session_token}"
    return RedirectResponse(redirect_url)


@router.get("/google/url")
async def get_google_auth_url(redirect_uri: str = None):
    """Generates the direct Google OAuth 2.0 authorization URL."""
    from urllib.parse import urlencode

    client_id = settings.GOOGLE_CLIENT_ID
    target_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    scope = "openid email profile"

    params = {
        "client_id": client_id,
        "redirect_uri": target_redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"
    return {"url": url}


@router.get("/google/callback")
async def google_auth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    return await process_google_oauth(code=code, redirect_uri=settings.GOOGLE_REDIRECT_URI, db=db)