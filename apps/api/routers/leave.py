from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamMember
from models.enums import LeaveStatus
from models.leave import LeaveRequest
from models.team import TeamMember
from models.user import User
from schemas.leave import LeaveRequestCreate, LeaveRequestOut

router = APIRouter(prefix="/api/v1/leave", tags=["leave"])


class LeaveListResponse:
    pass


@router.get("", response_model=list[LeaveRequestOut])
async def list_my_leave_requests(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        return []

    leave_result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.team_member_id == team_member.id)
        .order_by(LeaveRequest.created_at.desc())
    )
    leave_requests = leave_result.scalars().all()

    return leave_requests


@router.post(
    "", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED
)
async def create_leave_request(
    payload: LeaveRequestCreate,
    current_user: RequireTeamMember,
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

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date must be on or after start date",
        )

    leave_request = LeaveRequest(
        team_member_id=team_member.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.pending,
    )
    db.add(leave_request)
    await db.commit()
    await db.refresh(leave_request)

    return leave_request