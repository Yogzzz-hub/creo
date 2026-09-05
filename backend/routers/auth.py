import json
import logging

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core.config import settings
from core.database import get_db
from core.exceptions import limiter
from models.enums import AccountStatus, UserRole
from models.user import User
from schemas.auth import RegisterRequest, RegisterResponse
from workers.notification_tasks import notify_incomplete_signup
from workers.notification_tasks import notify_incomplete_signup, send_verification_email_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

REDIS_ABANDONED_CART_PREFIX = "abandoned_cart:"


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