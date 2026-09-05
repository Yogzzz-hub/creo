from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import LeaveStatus
from models.leave import LeaveRequest
from models.team import TeamMember
from models.user import User
from schemas.leave import AdminLeaveResponse, LeaveRequestOut

router = APIRouter(prefix="/api/v1/admin", tags=["admin-leave"])


@router.get("/leave", response_model=list[AdminLeaveResponse])
async def list_all_leave_requests(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).order_by(LeaveRequest.created_at.desc())
    )
    leave_requests = result.scalars().all()

    responses = []
    for lr in leave_requests:
        tm_result = await db.execute(
            select(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.id == lr.team_member_id)
        )
        row = tm_result.first()
        employee_name = row[1].full_name if row else "Unknown"
        department = row[0].department.value if row else "Unknown"

        responses.append(
            AdminLeaveResponse(
                id=lr.id,
                team_member_id=lr.team_member_id,
                employee_name=employee_name,
                department=department,
                start_date=lr.start_date,
                end_date=lr.end_date,
                reason=lr.reason,
                status=lr.status,
                created_at=lr.created_at,
            )
        )

    return responses


@router.post("/leave/{leave_id}/approve", response_model=LeaveRequestOut)
async def approve_leave_request(
    leave_id: str,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == leave_id)
    )
    leave = result.scalar_one_or_none()

    if leave is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found",
        )

    if leave.status != LeaveStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Leave request is already {leave.status.value}",
        )

    leave.status = LeaveStatus.approved
    leave.reviewed_by = current_user.id
    leave.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(leave)

    return leave


@router.post("/leave/{leave_id}/reject", response_model=LeaveRequestOut)
async def reject_leave_request(
    leave_id: str,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == leave_id)
    )
    leave = result.scalar_one_or_none()

    if leave is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found",
        )

    if leave.status != LeaveStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Leave request is already {leave.status.value}",
        )

    leave.status = LeaveStatus.rejected
    leave.reviewed_by = current_user.id
    leave.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(leave)

    return leave
