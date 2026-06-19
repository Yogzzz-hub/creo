from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.database import get_db
from core.security import require_client
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
from services.storage import generate_signed_download_url

router = APIRouter(prefix="/api/v1/deliverables", tags=["deliverables"])

DELIVERABLES_BUCKET = "deliverables"


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
