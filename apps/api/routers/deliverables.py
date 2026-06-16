from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser
from models.deliverable import Deliverable, DeliverableComment
from models.enums import DeliverableStatus
from schemas.deliverable import DeliverableCommentCreate, DeliverableCommentOut
from schemas.portal import (
    DeliverableRejectRequest,
    DeliverableResponse,
)

router = APIRouter(prefix="/api/v1/deliverables", tags=["deliverables"])


@router.get("", response_model=list[DeliverableResponse])
async def list_deliverables(
    current_user: CurrentUser,
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
    current_user: CurrentUser,
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

    if deliverable.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this deliverable",
        )

    return deliverable


@router.post("/{deliverable_id}/approve", response_model=DeliverableResponse)
async def approve_deliverable(
    deliverable_id: str,
    current_user: CurrentUser,
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

    if deliverable.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to approve this deliverable",
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
    current_user: CurrentUser,
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

    if deliverable.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject this deliverable",
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
