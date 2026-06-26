import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import decrypt_token, encrypt_token, require_client, require_team_member
from models.deliverable import Deliverable, DeliverableComment
from models.enums import DeliverableStatus
from models.user import User
from schemas.deliverable import (
    DeliverableCommentCreate,
    DeliverableCommentOut,
    DownloadResponse,
)
from schemas.portal import (
    DeliverableRejectRequest,
    DeliverableResponse,
)
from schemas.upload import (
    ALLOWED_MIME_TYPES,
    ALLOWED_VIDEO_MIME_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    UploadURLRequest,
    UploadURLResponse,
)
from services.instagram import publish_media, refresh_access_token
from services.storage import generate_signed_download_url, generate_signed_upload_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/deliverables", tags=["deliverables"])

DELIVERABLES_BUCKET = "deliverables"


@router.post("/upload-url", response_model=UploadURLResponse)
async def get_upload_url(
    payload: UploadURLRequest,
    current_user: Annotated[User, Depends(require_team_member)],
):
    if payload.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {payload.mime_type}. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    if payload.mime_type in ALLOWED_VIDEO_MIME_TYPES:
        max_size = MAX_VIDEO_SIZE_BYTES
        size_label = "500MB"
    else:
        max_size = MAX_IMAGE_SIZE_BYTES
        size_label = "10MB"

    if payload.file_size_bytes > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size for this type is {size_label}.",
        )

    ext = payload.file_name.rsplit(".", 1)[-1] if "." in payload.file_name else "bin"
    file_path = f"{current_user.id}/{uuid.uuid4().hex}.{ext}"

    try:
        upload_url = await run_in_threadpool(
            generate_signed_upload_url,
            DELIVERABLES_BUCKET,
            file_path,
            3600,
        )
    except Exception as exc:
        logger.exception("Failed to generate upload URL for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL.",
        )

    return UploadURLResponse(
        upload_url=upload_url,
        file_path=file_path,
        expires_in=3600,
    )


@router.get("", response_model=list[DeliverableResponse])
async def list_deliverables(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable)
        .where(Deliverable.client_id == current_user.id)
        .order_by(Deliverable.created_at.desc())
    )
    deliverables = result.scalars().all()
    return deliverables


@router.get("/{deliverable_id}", response_model=DeliverableResponse)
async def get_deliverable(
    deliverable_id: str,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    return deliverable


@router.get("/{deliverable_id}/download", response_model=DownloadResponse)
async def download_deliverable(
    deliverable_id: str,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    if deliverable.status != DeliverableStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only approved deliverables can be downloaded",
        )

    signed_url = await run_in_threadpool(
        generate_signed_download_url,
        DELIVERABLES_BUCKET,
        deliverable.file_url,
        3600,
    )

    return DownloadResponse(download_url=signed_url, expires_in=3600)


@router.post("/{deliverable_id}/approve", response_model=DeliverableResponse)
async def approve_deliverable(
    deliverable_id: str,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    deliverable.status = DeliverableStatus.approved
    deliverable.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(deliverable)

    return deliverable


@router.post("/{deliverable_id}/reject", response_model=DeliverableResponse)
async def reject_deliverable(
    deliverable_id: str,
    payload: DeliverableRejectRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    deliverable.status = DeliverableStatus.rejected
    deliverable.rejected_at = datetime.now(timezone.utc)

    rejection_comment = DeliverableComment(
        deliverable_id=deliverable.id,
        author_id=current_user.id,
        comment_text=payload.comment_text,
        is_rejection_reason=True,
    )
    db.add(rejection_comment)

    await db.commit()
    await db.refresh(deliverable)

    return deliverable


@router.get("/{deliverable_id}/comments", response_model=list[DeliverableCommentOut])
async def list_deliverable_comments(
    deliverable_id: str,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    comments_result = await db.execute(
        select(DeliverableComment)
        .where(DeliverableComment.deliverable_id == deliverable_id)
        .order_by(DeliverableComment.created_at.asc())
    )
    return comments_result.scalars().all()


@router.post(
    "/{deliverable_id}/comments",
    response_model=DeliverableCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_deliverable_comment(
    deliverable_id: str,
    payload: DeliverableCommentCreate,
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id,
            Deliverable.client_id == current_user.id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    comment = DeliverableComment(
        deliverable_id=deliverable_id,
        author_id=current_user.id,
        comment_text=payload.comment_text,
        is_rejection_reason=False,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


class PublishInstagramRequest(BaseModel):
    caption: str = ""


class PublishInstagramResponse(BaseModel):
    success: bool
    message: str
    instagram_post_id: str | None = None


@router.post(
    "/{deliverable_id}/publish-instagram",
    response_model=PublishInstagramResponse,
)
async def publish_deliverable_to_instagram(
    deliverable_id: str,
    payload: PublishInstagramRequest,
    current_user: Annotated[User, Depends(require_team_member)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(Deliverable.id == deliverable_id)
    )
    deliverable = result.scalar_one_or_none()

    if deliverable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    if deliverable.status != DeliverableStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved deliverables can be published to Instagram",
        )

    client_result = await db.execute(
        select(User).where(User.id == deliverable.client_id)
    )
    client_user = client_result.scalar_one_or_none()

    if client_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client user not found",
        )

    if not client_user.instagram_access_token or not client_user.instagram_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client has not connected their Instagram account",
        )

    try:
        decrypted_token = decrypt_token(client_user.instagram_access_token)
    except Exception as exc:
        logger.exception(
            "Failed to decrypt Instagram token for client %s",
            client_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt Instagram access token",
        )

    try:
        publish_result = await publish_media(
            ig_user_id=client_user.instagram_user_id,
            access_token=decrypted_token,
            image_url=deliverable.file_url,
            caption=payload.caption,
        )
    except Exception as exc:
        logger.exception(
            "Instagram publish failed for deliverable %s: %s",
            deliverable_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to publish to Instagram: {exc}",
        )

    try:
        refresh_result = await refresh_access_token(decrypted_token)
        new_encrypted_token = encrypt_token(refresh_result["access_token"])
        client_user.instagram_access_token = new_encrypted_token
        db.add(client_user)
    except Exception as exc:
        logger.warning(
            "Failed to refresh Instagram token for client %s: %s",
            client_user.id,
            exc,
        )

    deliverable.instagram_published_at = datetime.now(timezone.utc)
    deliverable.instagram_post_id = publish_result["id"]

    await db.commit()
    await db.refresh(deliverable)

    return PublishInstagramResponse(
        success=True,
        message="Deliverable published to Instagram successfully",
        instagram_post_id=publish_result["id"],
    )
