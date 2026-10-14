"""Scoped publishing views and actions. Existing deliverable schedule route handles writes."""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.ops import AuditLog
from app.models.publishing import InstagramTestPost, PublishingJob
from app.models.user import ClientProfile, User
from app.models.work import Deliverable
from app.services import publishing_service as service

router = APIRouter(prefix="/publishing", tags=["Instagram publishing"])


class TestPostBody(BaseModel):
    request_id: uuid.UUID
    account_id: str = Field(min_length=1, max_length=255)
    scheduled_at: datetime | None = None
    caption: str = Field(default="Creo test post ? checking the Instagram publishing connection.", max_length=2200)


@router.get("/test-post/clients")
async def test_post_clients(actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from app.config import settings
    from app.models.enums import AccountStatus
    from app.services import instagram_test_post as test
    if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD):
        raise Forbidden("Only a team lead or administrator can run this test.")
    query = select(User, ClientProfile).join(ClientProfile, ClientProfile.user_id == User.id).where(
        User.role == UserRole.CLIENT, User.account_status == AccountStatus.ACTIVE,
        ClientProfile.ig_connection_status == "connected",
    )
    if actor.role != UserRole.SUPER_ADMIN:
        if not actor.agency_id:
            raise Forbidden("An agency is required.")
        query = query.where(User.agency_id == actor.agency_id)
    clients = []
    for user, profile in (await db.execute(query)).all():
        try:
            await test.authorize(db, actor, user.id)
            test.check_connection(profile, profile.instagram_user_id)
        except (Forbidden, NotFound, Conflict):
            continue
        clients.append({"id": str(user.id), "name": profile.company_name or user.full_name or user.email,
                        "username": profile.instagram_username, "account_id": profile.instagram_user_id})
    return {"clients": clients, "enabled": settings.INSTAGRAM_TEST_POSTING_ENABLED and settings.INSTAGRAM_CLIENT_MODE == "real"}


@router.post("/clients/{client_id}/test-post")
async def test_post(client_id: uuid.UUID, body: TestPostBody, background: BackgroundTasks,
                    actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from app.services import instagram_test_post as test
    row, created = await test.create(db, actor, client_id, body.request_id, body.account_id, body.scheduled_at, body.caption)
    if created and row.scheduled_at is None:
        background.add_task(test.run, row.id, row.agency_id, actor)
    return test.serialize(row)


@router.get("/test-post/queue")
async def test_post_queue(actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from app.services import instagram_test_post as test
    if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD):
        raise Forbidden("Only team leads and administrators can view test posts.")
    query = select(InstagramTestPost, User.full_name).join(User, User.id == InstagramTestPost.client_id)
    if actor.role != UserRole.SUPER_ADMIN:
        query = query.where(InstagramTestPost.agency_id == actor.agency_id)
    result = []
    for row, name in (await db.execute(query.order_by(InstagramTestPost.created_at.desc()).limit(100))).all():
        try:
            await test.authorize(db, actor, row.client_id)
        except (Forbidden, NotFound):
            continue
        result.append({**test.serialize(row), "client_name": name})
    return result


@router.get("/clients/{client_id}/test-post/{request_id}")
async def test_post_status(client_id: uuid.UUID, request_id: uuid.UUID,
                           actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from app.services import instagram_test_post as test
    await test.authorize(db, actor, client_id)
    row = await db.get(InstagramTestPost, request_id)
    if not row or row.client_id != client_id:
        raise NotFound("Test post not found.")
    return test.serialize(row)


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


class TimingRequestBody(BaseModel):
    requested_at: datetime
    reason: str = Field(default="", max_length=1000)


@router.post("/plan-calendar")
async def plan_calendar(actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from app.models.enums import DeliverableStatus
    if actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD):
        raise Forbidden("A lead or administrator must plan calendar posts.")
    query = select(Deliverable.id).where(Deliverable.status == DeliverableStatus.APPROVED, Deliverable.deleted_at.is_(None), Deliverable.is_archived.is_(False))
    if actor.role != UserRole.SUPER_ADMIN:
        if not actor.agency_id:
            raise Forbidden("An agency is required.")
        query = query.where(Deliverable.agency_id == actor.agency_id)
    ids = (await db.execute(query.order_by(Deliverable.created_at.desc()).limit(100))).scalars().all()
    planned, skipped = 0, 0
    for deliverable_id in ids:
        try:
            d = await db.get(Deliverable, deliverable_id)
            await service.access(db, actor, d, write=True)
            existing = await service.job_for(db, d)
            if existing or not d.file_url or not await service.calendar_plan(db, d):
                skipped += 1
                continue
            is_video = (d.file_type or "").startswith("video/") or str(d.file_url).split("?")[0].lower().endswith((".mp4", ".mov"))
            await service.schedule(db, actor, d, timezone="Asia/Kolkata", caption="", media_type="REELS" if is_video else "IMAGE")
            planned += 1
        except (Forbidden, Conflict):
            await db.rollback()
            skipped += 1
    return {"planned": planned, "skipped": skipped}


@router.post("/deliverables/{deliverable_id}/timing-request")
async def request_timing(deliverable_id: uuid.UUID, body: TimingRequestBody,
                         actor: Actor = Depends(get_current_actor), db: AsyncSession = Depends(get_db)):
    from datetime import UTC
    d = await deliverable(db, actor, deliverable_id)
    if actor.role != UserRole.CLIENT or actor.user_id != d.client_id:
        raise Forbidden("Only the client can request a timing change.")
    if body.requested_at.tzinfo is None or body.requested_at <= datetime.now(UTC):
        raise Conflict("Choose a future time with a timezone.")
    profile = await service.lock_profile(db, d.client_id)
    job = await service.job_for(db, d)
    if not job or job.status in service.FINAL | {"uncertain"} or job.stage in ("submitting", "confirmed", "confirmed_container"):
        raise Conflict("This post can no longer be changed. Contact your team.")
    job.status = "paused"
    job.lease_id, job.lease_until = None, None
    job.next_attempt_at = None
    job.last_error = f"Client requested {body.requested_at.isoformat()}: {body.reason}"
    await service.audit(db, job, "client_timing_requested", actor)
    await service.notify(db, job, "Client requested a publishing time change", job.last_error)
    await db.commit()
    return {"status": "paused", "message": "Your team has been notified. Automatic posting is paused pending review."}


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
