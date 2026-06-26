import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core.database import get_db
from core.security import RequireClient, encrypt_token
from models.user import User
from schemas.payments import TwoFactorRequest
from schemas.user import UserOut, UserUpdate
from services.instagram import exchange_instagram_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/account", tags=["account"])


class InstagramConnectRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=512)
    redirect_uri: str = Field(..., min_length=1, max_length=2048)


class InstagramConnectResponse(BaseModel):
    success: bool
    message: str


@router.post("/instagram", response_model=InstagramConnectResponse)
async def connect_instagram(
    payload: InstagramConnectRequest,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    try:
        long_lived_token = await exchange_instagram_token(
            code=payload.code,
            redirect_uri=payload.redirect_uri,
        )
    except ValueError as exc:
        logger.error(
            "Instagram token exchange failed for user %s: %s",
            current_user.id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid or expired Instagram OAuth code",
        )
    except Exception as exc:
        logger.exception(
            "Unexpected error during Instagram token exchange for user %s",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to connect with Instagram. Please try again.",
        )

    current_user.instagram_access_token = encrypt_token(long_lived_token)
    db.add(current_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation."
        )
    except Exception:
        await db.rollback()
        logger.exception("Transaction failed during Instagram connect")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed."
        )

    return InstagramConnectResponse(
        success=True,
        message="Instagram account connected successfully",
    )


@router.put("", response_model=UserOut)
async def update_account_profile(
    payload: UserUpdate,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation."
        )
    except Exception:
        await db.rollback()
        logger.exception("Transaction failed during profile update")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed."
        )
    return current_user


class TwoFactorResponse(BaseModel):
    success: bool
    two_fa_enabled: bool
    message: str


@router.patch("/2fa", response_model=TwoFactorResponse)
async def toggle_two_factor(
    payload: TwoFactorRequest,
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    current_user.two_fa_enabled = payload.enabled
    db.add(current_user)
    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation."
        )
    except Exception:
        await db.rollback()
        logger.exception("Transaction failed during 2FA toggle")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed."
        )

    return TwoFactorResponse(
        success=True,
        two_fa_enabled=current_user.two_fa_enabled,
        message=(
            "Two-factor authentication enabled."
            if payload.enabled
            else "Two-factor authentication disabled."
        ),
    )


class InstagramDisconnectResponse(BaseModel):
    success: bool
    message: str


@router.delete("/instagram", response_model=InstagramDisconnectResponse)
async def disconnect_instagram(
    current_user: RequireClient,
    db: AsyncSession = Depends(get_db),
):
    current_user.instagram_access_token = None
    current_user.instagram_user_id = None
    db.add(current_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation."
        )
    except Exception:
        await db.rollback()
        logger.exception("Transaction failed during Instagram disconnect")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed."
        )

    return InstagramDisconnectResponse(
        success=True,
        message="Instagram account disconnected successfully",
    )
