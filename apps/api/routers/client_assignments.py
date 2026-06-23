from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.client_assignment import ClientAssignment
from schemas.client_assignment import (
    ClientAssignmentCreate,
    ClientAssignmentOut,
)

router = APIRouter(prefix="/api/v1/client-assignments", tags=["client-assignments"])


@router.get("", response_model=list[ClientAssignmentOut])
async def list_client_assignments(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ClientAssignment)
        .where(ClientAssignment.is_active.is_(True))
        .order_by(ClientAssignment.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ClientAssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_client_assignment(
    payload: ClientAssignmentCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(ClientAssignment).where(
            ClientAssignment.client_id == payload.client_id,
            ClientAssignment.team_member_id == payload.team_member_id,
            ClientAssignment.deliverable_type == payload.deliverable_type,
            ClientAssignment.is_active.is_(True),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active assignment already exists for this client, team member, and deliverable type",
        )

    assignment = ClientAssignment(
        client_id=payload.client_id,
        team_member_id=payload.team_member_id,
        deliverable_type=payload.deliverable_type,
        assigned_by=current_user.id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment
