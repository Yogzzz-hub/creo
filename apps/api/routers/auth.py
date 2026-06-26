import json
import logging

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
