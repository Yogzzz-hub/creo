import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import decrypt_token, encrypt_token, require_active_client, require_team_member
from models.deliverable import Deliverable, DeliverableComment
from models.enums import DeliverableStatus, TaskStatus
from models.platform_settings import PlatformSettings
from models.task import Task
from models.user import User
from models.team import TeamMember
from models.task_history import TaskStatusHistory
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
from services.instagram import publish_media, publish_reel, refresh_access_token
from services.storage import generate_signed_download_url, generate_signed_upload_url, upload_file_to_storage

logger = logging.getLogger(__name__)

DEFAULT_REVISION_SLA_HOURS = 24

router = APIRouter(prefix="/api/v1/deliverables", tags=["deliverables"])

DELIVERABLES_BUCKET = "deliverables"


@router.post("/upload", response_model=DeliverableResponse, status_code=status.HTTP_201_CREATED)
async def upload_deliverable(
    client_id: Annotated[str, Form(...)],
    task_id: Annotated[str, Form(...)],
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(require_team_member)] = None,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a registered team member",
        )

    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if task.assigned_to != team_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This task is not assigned to you",
        )

    if task.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client ID mismatch for this task",
        )

    from routers.tasks import VALID_TASK_TRANSITIONS
    current_status = task.status
    target_status = TaskStatus.submitted
    allowed = VALID_TASK_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        allowed_names = ", ".join(s.value for s in allowed) if allowed else "none (terminal state)"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition task from '{current_status.value}' to '{target_status.value}'. Allowed transitions: {allowed_names}",
        )

    revision_result = await db.execute(
        select(func.coalesce(func.max(Deliverable.revision_round), 0)).where(
            Deliverable.task_id == task_id
        )
    )
    max_revision = revision_result.scalar() or 0
    revision_round = max_revision + 1

    file_content = await file.read()
    file_path = f"deliverables/{client_id}/{task_id}/{revision_round}/{file.filename}"

    try:
        public_url = await run_in_threadpool(
            upload_file_to_storage,
            DELIVERABLES_BUCKET,
            file_path,
            file_content,
            file.content_type or "application/octet-stream",
        )
    except Exception as exc:
        logger.exception("Failed to upload deliverable file to storage")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage.",
        )

    deliverable = Deliverable(
        task_id=task_id,
        client_id=client_id,
        submitted_by=team_member.id,
        file_url=public_url,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(file_content),
        status=DeliverableStatus.pending_approval,
        revision_round=revision_round,
    )
    db.add(deliverable)

    old_status = task.status
    new_status = TaskStatus.submitted

    if old_status != new_status:
        history = TaskStatusHistory(
            task_id=task.id,
            changed_by_user_id=current_user.id,
            old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
            new_status=new_status.value,
        )
        db.add(history)
        task.status = new_status
    task.submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(deliverable)
    return deliverable


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
    current_user: Annotated[User, Depends(require_active_client)],
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
    current_user: Annotated[User, Depends(require_active_client)],
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
    current_user: Annotated[User, Depends(require_active_client)],
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
    current_user: Annotated[User, Depends(require_active_client)],
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

    if deliverable.status not in (
        DeliverableStatus.pending_approval,
        DeliverableStatus.revised_pending_approval,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve deliverable in '{deliverable.status.value}' status",
        )

    now = datetime.now(timezone.utc)
    deliverable.status = DeliverableStatus.approved
    deliverable.approved_at = now

    task_result = await db.execute(
        select(Task).where(Task.id == deliverable.task_id)
    )
    task = task_result.scalar_one_or_none()

    if task is not None:
        task.status = TaskStatus.approved

    await db.commit()
    await db.refresh(deliverable)

    return deliverable


@router.post("/{deliverable_id}/reject", response_model=DeliverableResponse)
async def reject_deliverable(
    deliverable_id: str,
    payload: DeliverableRejectRequest,
    current_user: Annotated[User, Depends(require_active_client)],
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

    if deliverable.status not in (
        DeliverableStatus.pending_approval,
        DeliverableStatus.revised_pending_approval,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject deliverable in '{deliverable.status.value}' status",
        )

    now = datetime.now(timezone.utc)
    deliverable.status = DeliverableStatus.rejected
    deliverable.rejected_at = now

    rejection_comment = DeliverableComment(
        deliverable_id=deliverable.id,
        author_id=current_user.id,
        comment_text=payload.comment_text,
        is_rejection_reason=True,
    )
    db.add(rejection_comment)

    task_result = await db.execute(
        select(Task).where(Task.id == deliverable.task_id)
    )
    task = task_result.scalar_one_or_none()

    if task is not None:
        task.status = TaskStatus.revision

        settings_result = await db.execute(
            select(PlatformSettings).where(PlatformSettings.id == "default")
        )
        platform_settings = settings_result.scalar_one_or_none()
        sla_hours = (
            platform_settings.sla_revision_hours
            if platform_settings
            else DEFAULT_REVISION_SLA_HOURS
        )
        task.due_date = (now + timedelta(hours=sla_hours)).date()

    await db.commit()
    await db.refresh(deliverable)

    return deliverable


@router.get("/{deliverable_id}/comments", response_model=list[DeliverableCommentOut])
async def list_deliverable_comments(
    deliverable_id: str,
    current_user: Annotated[User, Depends(require_active_client)],
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
    current_user: Annotated[User, Depends(require_active_client)],
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

    is_video = deliverable.file_type.startswith("video/")

    try:
        if is_video:
            publish_result = await publish_reel(
                ig_user_id=client_user.instagram_user_id,
                access_token=decrypted_token,
                video_url=deliverable.file_url,
                caption=payload.caption,
            )
        else:
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
