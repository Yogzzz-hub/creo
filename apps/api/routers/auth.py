from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import limiter  
from models.enums import AccountStatus, UserRole
from models.user import User
from schemas.auth import RegisterRequest, RegisterResponse
from workers.notification_tasks import notify_incomplete_signup

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

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
    await db.commit()
    await db.refresh(user)

    # Schedule abandoned cart recovery WhatsApp for 1 hour (3600 seconds) from now.
    if user.phone:
        from core.config import settings
        checkout_url = f"{settings.FRONTEND_URL}/onboarding/verify" if hasattr(settings, 'FRONTEND_URL') else "https://creo.app/onboarding/verify"
        notify_incomplete_signup.apply_async(
            args=[user.phone, user.full_name, checkout_url],
            countdown=3600  
        )

    return RegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        account_status=user.account_status.value,
    )