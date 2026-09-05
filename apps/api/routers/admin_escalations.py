from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.escalation import Escalation
from schemas.escalation import EscalationResolveRequest, EscalationResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin-escalations"])


@router.get("/escalations", response_model=list[EscalationResponse])
async def list_escalations(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status", description="Filter by status"),
):
    query = select(Escalation)

    if status_filter:
        query = query.where(Escalation.status == status_filter)

    query = query.order_by(
        case(
            (Escalation.status == "open", 0),
            (Escalation.status == "in_progress", 1),
            else_=2,
        ),
        Escalation.created_at.desc(),
    )

    result = await db.execute(query)
    escalations = result.scalars().all()

    return escalations


@router.patch("/escalations/{escalation_id}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
    escalation_id: str,
    payload: EscalationResolveRequest,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Escalation).where(Escalation.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()

    if escalation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found",
        )

    if escalation.status == "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Escalation is already resolved",
        )

    escalation.status = "resolved"
    escalation.resolved_by = payload.resolved_by
    escalation.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(escalation)

    return escalation
