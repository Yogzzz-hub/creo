from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from core.security import RequireAdmin
from models.deliverable import Deliverable
from models.task import Task
from models.user import User
from models.team import TeamMember
from models.enums import DeliverableStatus, DeliverableType

router = APIRouter(prefix="/api/v1/admin", tags=["admin-deliverables"])


class AdminDeliverableResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    calendar_entry_id: Optional[str] = None
    task_id: Optional[str] = None
    type: str
    title: str
    file_url: Optional[str] = None
    status: str
    revision_count: int
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class DeliverableStatusUpdate(BaseModel):
    status: str


class DeliverableCreate(BaseModel):
    client_id: str
    type: str = "poster"
    title: str
    description: Optional[str] = None


@router.get("/deliverables", response_model=list[AdminDeliverableResponse])
async def list_admin_deliverables(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).order_by(Deliverable.created_at.desc())
    )
    deliverables = result.scalars().all()

    response = []
    for d in deliverables:
        client_result = await db.execute(select(User).where(User.id == d.client_id))
        client = client_result.scalar_one_or_none()

        assigned_name = None
        if d.submitted_by:
            member_result = await db.execute(
                select(TeamMember).where(TeamMember.id == d.submitted_by)
            )
            member = member_result.scalar_one_or_none()
            if member:
                assigned_name = member.full_name

        response.append(AdminDeliverableResponse(
            id=d.id,
            client_id=d.client_id,
            client_name=client.business_name or client.email if client else "Unknown",
            calendar_entry_id=None,
            task_id=d.task_id,
            type=d.file_type if d.file_type in ["poster", "reel", "story"] else "poster",
            title=f"{d.file_type.title()} - {d.id[:8]}",
            file_url=d.file_url,
            status=d.status.value if hasattr(d.status, 'value') else d.status,
            revision_count=d.revision_round or 0,
            assigned_to=d.submitted_by,
            assigned_name=assigned_name,
            created_at=d.created_at.isoformat() if d.created_at else "",
            updated_at=d.updated_at.isoformat() if d.updated_at else None,
        ))
    return response


@router.post("/deliverables", response_model=AdminDeliverableResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_deliverable(
    payload: DeliverableCreate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    client_result = await db.execute(select(User).where(User.id == payload.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    task = Task(
        client_id=payload.client_id,
        deliverable_type=DeliverableType(payload.type),
        content_brief=payload.description or payload.title,
        status="pending",
        assigned_by=_current_user.id,
    )
    db.add(task)
    await db.flush()

    deliverable = Deliverable(
        task_id=task.id,
        client_id=payload.client_id,
        submitted_by=_current_user.id,
        file_url="",
        file_type=payload.type,
        file_size_bytes=0,
        status=DeliverableStatus.pending_approval,
    )
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)

    return AdminDeliverableResponse(
        id=deliverable.id,
        client_id=deliverable.client_id,
        client_name=client.business_name or client.email,
        task_id=task.id,
        type=payload.type,
        title=payload.title,
        file_url=deliverable.file_url,
        status=deliverable.status.value,
        revision_count=0,
        assigned_to=deliverable.submitted_by,
        assigned_name=_current_user.full_name if hasattr(_current_user, 'full_name') else None,
        created_at=deliverable.created_at.isoformat() if deliverable.created_at else "",
        updated_at=None,
    )


@router.patch("/deliverables/{deliverable_id}/status")
async def update_deliverable_status(
    deliverable_id: str,
    payload: DeliverableStatusUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deliverable).where(Deliverable.id == deliverable_id)
    )
    deliverable = result.scalar_one_or_none()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    try:
        deliverable.status = DeliverableStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    await db.commit()
    await db.refresh(deliverable)

    return {"status": "updated"}
