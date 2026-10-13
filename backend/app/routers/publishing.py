"""Scoped publishing views and actions. Existing deliverable schedule route handles writes."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.ops import AuditLog
from app.models.publishing import PublishingJob
from app.models.user import ClientProfile, User
from app.models.work import Deliverable
from app.services import publishing_service as service

router = APIRouter(prefix="/publishing", tags=["Instagram publishing"])


class ScheduleBody(BaseModel):
    # Omit local_time to follow the deliverable's content calendar slot.
    local_time: str | None = Field(default=None, max_length=40)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)
    fold: Literal[0, 1] | None = None
    caption: str = Field(default="", max_length=2200)
    media_type: Literal["IMAGE", "REELS", "STORIES"]
    calendar_entry_id: uuid.UUID | None = None


class ApproveBody(BaseModel):
    fingerprint: str = Field(min_length=64, max_length=64)


class ActionBody(BaseModel):
    action: Literal[
        "pause", "resume", "cancel", "retry", "reconcile", "publish_now", "use_calendar"
    ]


async def deliverable(db, actor, deliverable_id):
    d = await db.get(Deliverable, deliverable_id)
    if not d:
        raise NotFound("Deliverable not found.")
    await service.access(db, actor, d)
    return d


@router.get("/jobs")
async def jobs(
    client_id: uuid.UUID | None = None,
    status: str | None = None,
    offset: int = Query(0, ge=0),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    return await service.scoped_jobs(db, actor, client_id, status, offset)


@router.get("/clients/{client_id}/connection")
async def client_connection(
    client_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise Forbidden("This view is for agency administrators.")
    client = await db.get(User, client_id)
    if not client or client.role != UserRole.CLIENT:
        raise NotFound("Client not found.")
    await service.access(db, actor, Deliverable(client_id=client.id, agency_id=client.agency_id))
    profile = await db.get(ClientProfile, client_id)
    if not profile:
        raise NotFound("Client profile not found.")
    from app.services.instagram_connection import public_status

    return public_status(profile)


@router.get("/deliverables/{deliverable_id}")
async def details(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    d = await deliverable(db, actor, deliverable_id)
    job = (
        await db.execute(select(PublishingJob).where(PublishingJob.deliverable_id == d.id))
    ).scalar_one_or_none()
    profile = await db.get(ClientProfile, d.client_id)
    plan = await service.calendar_plan(db, d)
    return {
        "job": service.serialize(job, d, plan[0] if plan else None) if job else None,
        "calendar_publish_at": plan[0].isoformat() if plan else None,
        "timezone": profile.timezone if profile else "Asia/Kolkata",
        "approval_status": str(d.status),
        "file_type": d.file_type,
        "connection_status": profile.ig_connection_status if profile else "disconnected",
        "account": (profile.ig_metadata or {}).get("username") if profile else None,
        "can_manage": actor.role
        in (
            UserRole.EDITOR,
            UserRole.DESIGNER,
            UserRole.TEAM_LEAD,
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN,
        ),
        "can_approve": actor.role == UserRole.CLIENT
        and actor.user_id == d.client_id
        and str(d.status) == "approved",
    }


@router.post("/deliverables/{deliverable_id}/approve")
async def approve(
    deliverable_id: uuid.UUID,
    body: ApproveBody,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    d = await deliverable(db, actor, deliverable_id)
    return service.serialize(await service.approve_publication(db, actor, d, body.fingerprint), d)


@router.post("/deliverables/{deliverable_id}/action")
async def action(
    deliverable_id: uuid.UUID,
    body: ActionBody,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    d = await deliverable(db, actor, deliverable_id)
    if body.action == "reconcile":
        if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise Forbidden("An administrator must reconcile uncertain publication.")
        job = (
            await db.execute(select(PublishingJob).where(PublishingJob.deliverable_id == d.id))
        ).scalar_one_or_none()
        if not job or job.status != "uncertain":
            raise Forbidden("Only an uncertain publication can be reconciled.")
        from app.workers.tasks.publish import publish_deliverable_task

        # Read-only provider reconciliation is executed by the existing queue.
        try:
            publish_deliverable_task.apply_async((str(job.id), str(job.agency_id)), retry=False)
        except Exception:
            raise Conflict(
                "Publishing worker is unavailable. Try reconciliation again later."
            ) from None
        return {"status": "reconciliation_queued"}
    return service.serialize(await service.action(db, actor, d, body.action), d)


@router.get("/deliverables/{deliverable_id}/history")
async def history(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    d = await deliverable(db, actor, deliverable_id)
    job = (
        await db.execute(select(PublishingJob).where(PublishingJob.deliverable_id == d.id))
    ).scalar_one_or_none()
    if not job:
        return []
    rows = (
        (
            await db.execute(
                select(AuditLog)
                .where(AuditLog.entity == "instagram_publishing", AuditLog.entity_id == job.id)
                .order_by(AuditLog.created_at.desc())
                .limit(100)
            )
        )
        .scalars()
        .all()
    )
    return [
        {"action": r.action, "at": r.created_at.isoformat(), "details": r.to_value} for r in rows
    ]
