from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import LeaveStatus
from models.leave import LeaveRequest
from schemas.leave import LeaveRequestOut

router = APIRouter(prefix="/api/v1/admin", tags=["admin-leave"])


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
    leave.approved_by = current_user.id
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
    leave.approved_by = current_user.id
    await db.commit()
    await db.refresh(leave)

    return leave
