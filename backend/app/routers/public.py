"""Public API router for marketing endpoints: studio ledger and sample request capture."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.ops import SampleRequest
from app.models.work import Deliverable, Task

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/public", tags=["Public"])


class SampleSubmitRequest(BaseModel):
    email: EmailStr
    instagram_handle: str


@router.get("/ledger")
async def get_public_ledger(
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return studio ledger batches.

    Under Rule R1 & Task 4.19: If fewer than 20 batches exist in the system,
    return has_enough=False so frontend renders " — " instead of fabricated activity.
    """
    count_stmt = select(func.count(Deliverable.id))
    total_deliverables = (await db.execute(count_stmt)).scalar() or 0

    if total_deliverables < 20:
        return {
            "has_enough": False,
            "count": total_deliverables,
            "items": [],
            "message": "Fewer than 20 batches exist in the system.",
        }

    # Retrieve real batches
    stmt = (
        select(Deliverable)
        .order_by(Deliverable.created_at.desc())
        .limit(20)
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        {
            "id": str(d.id),
            "file_type": d.file_type,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in rows
    ]

    return {
        "has_enough": True,
        "count": total_deliverables,
        "items": items,
    }


@router.post("/sample")
@router.post("/sample-request")
async def submit_sample_request(
    body: SampleSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Capture free sample request email + Instagram handle to sample_requests table."""
    handle = body.instagram_handle.strip()
    if not handle.startswith("@"):
        handle = f"@{handle}"

    sample_req = SampleRequest(
        email=body.email.lower().strip(),
        instagram_handle=handle,
        status="pending",
    )
    db.add(sample_req)
    await db.commit()
    await db.refresh(sample_req)

    log.info("sample_request_created", email=sample_req.email, handle=sample_req.instagram_handle)

    return {
        "status": "success",
        "message": "Sample request received successfully!",
        "id": str(sample_req.id),
        "email": sample_req.email,
        "instagram_handle": sample_req.instagram_handle,
    }
