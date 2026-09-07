"""Calendar router: client and agency publishing schedule entries."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.work import Deliverable

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/entries", response_model=list[dict[str, Any]])
async def get_calendar_entries(
    client_id: uuid.UUID | None = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retrieve scheduled and published content calendar entries."""
    target_client_id = client_id or actor.client_id or actor.user_id

    # If client role, require active, unexpired subscription
    if actor.role == "client":
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, target_client_id)
        if not sub_check["is_active"]:
            return []

    stmt = (
        select(Deliverable)
        .where(Deliverable.client_id == target_client_id)
        .order_by(Deliverable.created_at.asc())
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return [
        {
            "id": str(e.id),
            "title": f"{e.file_type.upper()} Deliverable v{e.version}",
            "date": (e.scheduled_at or getattr(e, "due_date", None) or e.created_at).strftime("%Y-%m-%d"),
            "scheduled_at": (e.scheduled_at or getattr(e, "due_date", None) or e.created_at).isoformat(),
            "status": e.status.value,
            "file_url": e.file_url,
            "file_type": e.file_type,
            "permalink": e.ig_permalink,
        }
        for e in entries
    ]
