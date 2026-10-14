"""Publishing permissions, approval snapshots and scheduling, separate from production status."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden
from app.core.rbac import Actor
from app.models.enums import AccountStatus, DeliverableStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.publishing import PublishingJob
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Deliverable, Task
from app.services import deliverable_workflow as workflow

FINAL = {"published", "canceled"}
BUSY = {"processing", "uncertain"}


def utc_schedule(local_time: str, timezone: str, fold: int | None = None) -> datetime:
    try:
        zone = ZoneInfo(timezone)
        local = datetime.fromisoformat(local_time)
    except (ValueError, ZoneInfoNotFoundError):
        raise Conflict(
            "Enter a valid date/time and IANA timezone.", code="INVALID_SCHEDULE"
        ) from None
    if local.tzinfo is not None:
        raise Conflict("Enter local wall time without an offset and select its timezone.")
    candidates = [local.replace(tzinfo=zone, fold=f) for f in (0, 1)]
    valid = [
        c for c in candidates if c.astimezone(UTC).astimezone(zone).replace(tzinfo=None) == local
    ]
    if not valid:
        raise Conflict(
            "This local time does not exist due to a daylight-saving change.",
            code="NONEXISTENT_TIME",
        )
    if len({c.utcoffset() for c in valid}) > 1 and fold is None:
        raise Conflict(
            "This time occurs twice. Select the first or second occurrence.", code="AMBIGUOUS_TIME"
        )
    result = candidates[fold or 0].astimezone(UTC)
    if result <= datetime.now(UTC):
        raise Conflict(
            "Choose a future publishing time. Past schedules never publish automatically.",
            code="PAST_SCHEDULE",
        )
    return result


def fingerprint(
    d: Deliverable, caption: str, media_type: str, media_metadata: dict | None = None
) -> str:
    values = [
        str(d.id),
        d.version,
        d.file_url,
        d.file_type,
        d.file_size_bytes,
        caption,
        media_type,
        (media_metadata or {}).get("sha256"),
    ]
    return hashlib.sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()


def approved(job: PublishingJob, d: Deliverable) -> bool:
    return bool(
        d.status == DeliverableStatus.APPROVED
        and d.approved_at
        and job.approved_by == d.client_id
        and job.media_metadata
        and job.media_metadata.get("sha256")
        and job.approved_fingerprint
        == fingerprint(d, job.caption, job.media_type, job.media_metadata)
    )


async def access(db: AsyncSession, actor: Actor, d: Deliverable, *, write: bool = False) -> User:
    client = await db.get(User, d.client_id)
    caller = await db.get(User, actor.user_id)
    if (
        not caller
        or caller.account_status != AccountStatus.ACTIVE
        or caller.must_reset_password
        or caller.role != actor.role
    ):
        raise Forbidden("An active authorized account is required.")
    if actor.token_version is not None and actor.token_version != caller.token_version:
        raise Forbidden("Your session changed. Sign in again.")
    if not client or not client.agency_id or (d.agency_id and d.agency_id != client.agency_id):
        raise Forbidden("The deliverable has no valid client agency.")
    if actor.role != UserRole.SUPER_ADMIN and (
        actor.agency_id != client.agency_id or caller.agency_id != client.agency_id
    ):
        raise Forbidden("This content belongs to another agency.")
    if actor.role == UserRole.CLIENT:
        if write or actor.user_id != d.client_id:
            raise Forbidden(
                "Clients can review their own publishing information; the team manages schedules."
            )
    elif actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        if actor.role not in (UserRole.EDITOR, UserRole.DESIGNER, UserRole.TEAM_LEAD):
            raise Forbidden("Your role cannot manage Instagram publishing.")
        await workflow.get_deliverable_for_review(db, actor, d.id)
    return client


async def lock_profile(db: AsyncSession, client_id: uuid.UUID) -> ClientProfile:
    profile = (
        await db.execute(
            select(ClientProfile)
            .where(ClientProfile.user_id == client_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not profile:
        raise Conflict("Client profile is missing.")
    return profile


async def job_for(
    db: AsyncSession, d: Deliverable, *, create: bool = False, actor_id: uuid.UUID | None = None
) -> PublishingJob | None:
    job = (
        await db.execute(
            select(PublishingJob)
            .where(PublishingJob.deliverable_id == d.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not job and create:
        client = await db.get(User, d.client_id)
        if not client or not client.agency_id:
            raise Conflict("Assign the client to an agency before scheduling.")
        task = await db.get(Task, d.task_id) if d.task_id else None
        kind = str(task.deliverable_type) if task else ""
        media_type = (
            "STORIES"
            if kind == "story"
            else ("REELS" if d.file_type.startswith("video/") else "IMAGE")
        )
        # Unsupported carousels must not silently become one image.
        if kind == "carousel":
            raise Conflict(
                "Carousel publishing is not supported by this single-asset workflow.",
                code="UNSUPPORTED_MEDIA",
            )
        calendar = (
            await db.execute(
                select(ContentCalendar)
                .where(
                    ContentCalendar.deliverable_id == d.id, ContentCalendar.client_id == d.client_id
                )
                .order_by(ContentCalendar.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        job = PublishingJob(
            agency_id=client.agency_id,
            client_id=d.client_id,
            deliverable_id=d.id,
            calendar_entry_id=calendar.id if calendar else None,
            caption=calendar.caption or "" if calendar else "",
            media_type=media_type,
            created_by=actor_id,
            updated_by=actor_id,
            status="pending_approval",
            stage="new",
            attempts=0,
        )
        db.add(job)
        await db.flush()
    return job


async def audit(
    db: AsyncSession, job: PublishingJob, action: str, actor: Actor | None = None
) -> None:
    db.add(
        AuditLog(
            agency_id=job.agency_id,
            actor_id=actor.user_id if actor else None,
            actor_role=actor.role if actor else None,
            entity="instagram_publishing",
            entity_id=job.id,
            action=action,
            to_value={
                "status": job.status,
                "stage": job.stage,
                "attempt": job.attempts,
                "error_code": job.error_code,
                "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
                "account_id": job.instagram_account_id,
                "media_id": job.media_id,
            },
        )
    )


async def notify(db: AsyncSession, job: PublishingJob, title: str, message: str) -> None:
    d = await db.get(Deliverable, job.deliverable_id)
    task = await db.get(Task, d.task_id) if d.task_id else None
    recipients = await workflow._team_recipients(db, d, task)
    recipients.add(job.client_id)
    if job.status in ("failed", "paused", "uncertain"):
        recipients.update(
            (
                await db.execute(
                    select(User.id).where(
                        User.agency_id == job.agency_id,
                        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                    )
                )
            )
            .scalars()
            .all()
        )
    recipient_roles = dict(
        (
            await db.execute(
                select(User.id, User.role).where(
                    User.id.in_(recipients), User.agency_id == job.agency_id
                )
            )
        ).all()
    )
    for user_id, role in recipient_roles.items():
        link = (
            "/admin/calendar"
            if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
            else ("/team-lead/dashboard" if role == UserRole.TEAM_LEAD else "/workstation/tasks")
        )
        db.add(
            Notification(
                agency_id=job.agency_id,
                user_id=user_id,
                title=title,
                message=message,
                link=f"/portal/deliverables/{d.id}" if user_id == job.client_id else link,
            )
        )


def set_ready(job: PublishingJob, d: Deliverable, profile: ClientProfile) -> None:
    job.last_error, job.error_code = None, None
    if not approved(job, d):
        job.status = "pending_approval"
    elif not job.scheduled_at or job.scheduled_at <= datetime.now(UTC):
        job.status = "needs_schedule"
        if job.scheduled_at:
            job.last_error = "The planned time passed. Select a new future schedule."
    elif profile.ig_connection_status != "connected" or not profile.ig_token_encrypted:
        job.status, job.last_error = "paused", "Client must connect Instagram before publishing."
        job.error_code = "RECONNECT_REQUIRED"
    else:
        job.status = "scheduled"
        job.connection_id, job.instagram_account_id = (
            profile.ig_connection_id,
            profile.instagram_user_id,
        )
    # Reserve time for media fetching, validation and Instagram transcoding.
    job.next_attempt_at = job.scheduled_at - timedelta(minutes=30) if job.scheduled_at else None


async def on_deliverable_transition(
    db: AsyncSession,
    d: Deliverable,
    target: str,
    actor_id: uuid.UUID | None,
    review_fingerprint: str | None = None,
) -> None:
    """Called in the existing transition transaction. Never executes or enqueues a post."""
    existing = (
        await db.execute(select(PublishingJob.id).where(PublishingJob.deliverable_id == d.id))
    ).scalar_one_or_none()
    if not existing:
        return
    await lock_profile(db, d.client_id)
    job = await job_for(db, d)
    if not job:
        return  # Existing approvals are not automatically enrolled.
    if job.status == "published":
        return
    if job.status in BUSY:
        raise Conflict(
            "Publishing is in progress or needs reconciliation. "
            "Resolve it before changing this version."
        )
    if target in ("scheduled", "publishing", "published", "publish_failed"):
        raise Conflict("Use Instagram publishing controls for this enrolled version.")
    if target == "approved" and actor_id == d.client_id:
        profile = await db.get(ClientProfile, d.client_id)
        if review_fingerprint and review_fingerprint != fingerprint(
            d, job.caption, job.media_type, job.media_metadata
        ):
            raise Conflict(
                "Publishing details changed. Reload and review the latest caption before approving."
            )
        job.approved_by = actor_id if review_fingerprint else None
        job.approved_fingerprint = review_fingerprint
        if job.status != "canceled":
            set_ready(job, d, profile)
        await audit(db, job, "client_approved")
        await notify(
            db,
            job,
            "Approved content ready for scheduling",
            "Client approval is recorded. Publication follows the configured future schedule.",
        )
    elif target not in ("approved", "scheduled", "publishing", "published"):
        job.approved_fingerprint, job.approved_by = None, None
        job.status = "canceled"
        job.last_error = (
            "This version was rejected or superseded. The revised version requires approval."
        )
        await audit(db, job, "version_invalidated")


async def calendar_plan(
    db: AsyncSession, d: Deliverable
) -> tuple[datetime, uuid.UUID] | None:
    """The content calendar slot that drives this deliverable's automatic posting."""
    entry = (
        await db.execute(
            select(ContentCalendar)
            .where(
                ContentCalendar.deliverable_id == d.id,
                ContentCalendar.client_id == d.client_id,
            )
            .order_by(ContentCalendar.publish_date.asc())
        )
    ).scalars().first()
    if not entry:
        return None
    when = entry.publish_at or entry.scheduled_time
    if not when:
        return None
    return (when if when.tzinfo else when.replace(tzinfo=UTC)).astimezone(UTC), entry.id


async def schedule(
    db: AsyncSession,
    actor: Actor,
    d: Deliverable,
    *,
    local_time: str | None = None,
    timezone: str,
    caption: str,
    media_type: str,
    fold: int | None = None,
    calendar_entry_id: uuid.UUID | None = None,
) -> PublishingJob:
    await access(db, actor, d, write=True)
    # The content calendar is the default source of truth for posting times; an explicit
    # local_time is only an override by the team.
    if local_time:
        when = utc_schedule(local_time, timezone, fold)
    else:
        plan = await calendar_plan(db, d)
        if not plan:
            raise Conflict(
                "This deliverable has no content calendar slot. Add one or set a time.",
                code="NO_CALENDAR_SLOT",
            )
        when, calendar_entry_id = plan
        # Show the calendar slot in the client's own timezone, not a request default.
        client_zone = await db.scalar(
            select(ClientProfile.timezone).where(ClientProfile.user_id == d.client_id)
        )
        timezone = client_zone or timezone
        if when <= datetime.now(UTC):
            raise Conflict(
                "The calendar slot for this deliverable is in the past. "
                "Move the calendar date or post it now.",
                code="CALENDAR_SLOT_PAST",
            )
    profile = await lock_profile(db, d.client_id)
    await db.refresh(d)
    job = await job_for(db, d, create=True, actor_id=actor.user_id)
    if (
        job.status in BUSY
        or job.status == "published"
        or job.stage in ("submitting", "confirmed_container")
    ):
        raise Conflict("An active or completed publishing attempt cannot be rescheduled.")
    if media_type not in ("IMAGE", "REELS", "STORIES"):
        raise Conflict("Unsupported Instagram media type.")
    if media_type == "STORIES" and caption.strip():
        raise Conflict(
            "Story captions are not supported. Supply a Story asset with its text already included."
        )
    if calendar_entry_id:
        calendar = await db.get(ContentCalendar, calendar_entry_id)
        if (
            not calendar
            or calendar.client_id != d.client_id
            or calendar.deliverable_id not in (None, d.id)
        ):
            raise Forbidden("Calendar entry belongs to another client or version.")
        job.calendar_entry_id = calendar.id
    if caption != job.caption or media_type != job.media_type:
        job.approved_fingerprint, job.approved_by = None, None
    from app.services.instagram_media import inspect_media

    _, metadata = await inspect_media(d.file_url, media_type)
    if not job.media_metadata or metadata["sha256"] != job.media_metadata.get("sha256"):
        job.approved_fingerprint, job.approved_by = None, None
    job.media_metadata = metadata
    job.caption, job.media_type = caption, media_type
    job.scheduled_at, job.timezone = when, timezone
    job.container_id, job.container_created_at = None, None
    job.stage, job.attempts = "new", 0
    job.updated_by = actor.user_id
    set_ready(job, d, profile)
    await audit(db, job, "schedule_updated", actor)
    await notify(
        db,
        job,
        "Instagram schedule updated",
        f"Planned for {when.astimezone(ZoneInfo(timezone)):%d %b %Y %H:%M} "
        f"({timezone}). Status: {job.status.replace('_', ' ')}.",
    )
    await db.commit()
    return job


async def approve_publication(
    db: AsyncSession, actor: Actor, d: Deliverable, expected: str
) -> PublishingJob:
    await access(db, actor, d)
    if (
        actor.role != UserRole.CLIENT
        or actor.user_id != d.client_id
        or d.status != DeliverableStatus.APPROVED
    ):
        raise Forbidden("Only the client can approve publishing details of approved content.")
    profile = await lock_profile(db, d.client_id)
    await db.refresh(d)
    if d.status != DeliverableStatus.APPROVED:
        raise Conflict("This version is no longer approved.")
    job = await job_for(db, d)
    if not job or job.status in BUSY | FINAL:
        raise Conflict("No editable publishing details are available.")
    if expected != fingerprint(d, job.caption, job.media_type, job.media_metadata):
        raise Conflict("Publishing details changed. Reload and review the latest caption.")
    job.approved_fingerprint, job.approved_by = expected, actor.user_id
    set_ready(job, d, profile)
    await audit(db, job, "publishing_details_approved", actor)
    await notify(
        db,
        job,
        "Publishing details approved",
        "Client approved the exact media version and caption.",
    )
    await db.commit()
    return job


async def action(db: AsyncSession, actor: Actor, d: Deliverable, operation: str) -> PublishingJob:
    await access(db, actor, d, write=True)
    profile = await lock_profile(db, d.client_id)
    job = await job_for(db, d)
    safe_preparation_pause = job and operation == "pause" and job.status == "processing" and job.stage not in ("submitting", "confirmed", "confirmed_container")
    if not job or (job.status in BUSY | {"published"} and not safe_preparation_pause):
        raise Conflict(
            "This job is processing, published or requires reconciliation; it cannot be changed."
        )
    if operation in ("pause", "retry") and actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD):
        raise Forbidden("An administrator must pause or retry publishing.")
    if operation == "publish_now" and actor.role not in (
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.TEAM_LEAD,
    ):
        raise Forbidden("An administrator or team lead must publish ahead of schedule.")
    if operation == "cancel":
        job.status = "canceled"
    elif operation == "pause":
        job.status = "paused"
        job.lease_id, job.lease_until = None, None
    elif operation in ("resume", "retry"):
        if operation == "resume" and job.status != "paused":
            raise Conflict("Only a paused job can be resumed.")
        if operation == "retry" and job.status != "failed":
            raise Conflict("Only a failed job can be retried.")
        if not job.scheduled_at or job.scheduled_at <= datetime.now(UTC):
            raise Conflict("Choose a new future schedule before resuming or retrying.")
        if job.stage == "submitting":
            raise Conflict("The previous provider result is uncertain; reconcile it first.")
        job.attempts, job.stage, job.container_id = 0, "new", None
        set_ready(job, d, profile)
    elif operation == "publish_now":
        # Manual override for a broken or missed schedule. Approval and the client's own
        # Instagram connection are still required; only the timing is bypassed.
        if not approved(job, d):
            raise Conflict("This exact version and caption need client approval first.")
        if profile.ig_connection_status != "connected" or not profile.ig_token_encrypted:
            raise Conflict("The client must connect Instagram before publishing.")
        job.last_error, job.error_code = None, None
        job.attempts, job.stage, job.container_id = 0, "new", None
        job.scheduled_at = job.next_attempt_at = datetime.now(UTC)
        job.status = "scheduled"
        job.connection_id, job.instagram_account_id = (
            profile.ig_connection_id,
            profile.instagram_user_id,
        )
    elif operation == "use_calendar":
        plan = await calendar_plan(db, d)
        if not plan:
            raise Conflict(
                "This deliverable has no content calendar slot.", code="NO_CALENDAR_SLOT"
            )
        when, entry_id = plan
        if when <= datetime.now(UTC):
            raise Conflict(
                "The calendar slot for this deliverable is in the past. "
                "Move the calendar date or post it now.",
                code="CALENDAR_SLOT_PAST",
            )
        job.calendar_entry_id = entry_id
        job.scheduled_at = when
        job.attempts, job.stage, job.container_id = 0, "new", None
        set_ready(job, d, profile)
    else:
        raise Conflict("Unsupported publishing operation.")
    job.updated_by = actor.user_id
    await audit(db, job, operation, actor)
    await db.commit()
    if operation == "publish_now":
        from app.workers.tasks.publish import publish_deliverable_task

        try:
            publish_deliverable_task.apply_async(
                (str(job.id), str(job.agency_id)), retry=False
            )
        except Exception:  # The beat sweeper picks it up when the broker is unavailable.
            pass
    return job


def serialize(job: PublishingJob, d: Deliverable, calendar_at: datetime | None = None) -> dict:
    result = {
        key: getattr(job, key)
        for key in (
            "status",
            "caption",
            "media_type",
            "timezone",
            "attempts",
            "last_error",
            "error_code",
            "media_id",
            "permalink",
            "instagram_account_id",
            "stage",
        )
    }
    for key in ("id", "client_id", "deliverable_id", "calendar_entry_id"):
        result[key] = str(getattr(job, key)) if getattr(job, key) else None
    for key in ("scheduled_at", "published_at", "last_attempt_at"):
        result[key] = getattr(job, key).isoformat() if getattr(job, key) else None
    result.update(
        calendar_publish_at=calendar_at.isoformat() if calendar_at else None,
        version=d.version,
        approval_status=str(d.status),
        approved=approved(job, d),
        review_fingerprint=fingerprint(d, job.caption, job.media_type, job.media_metadata),
    )
    return result


async def scoped_jobs(
    db: AsyncSession,
    actor: Actor,
    client_id: uuid.UUID | None = None,
    status: str | None = None,
    offset: int = 0,
) -> list[dict]:
    query = (
        select(PublishingJob, Deliverable, User.full_name)
        .join(Deliverable, PublishingJob.deliverable_id == Deliverable.id)
        .join(User, User.id == PublishingJob.client_id)
    )
    if actor.role != UserRole.SUPER_ADMIN:
        if not actor.agency_id:
            raise Forbidden("An agency is required.")
        query = query.where(PublishingJob.agency_id == actor.agency_id)
    if actor.role == UserRole.CLIENT:
        query = query.where(PublishingJob.client_id == actor.user_id)
    elif actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        lead_ids = select(StaffProfile.team_lead_id).where(StaffProfile.user_id == actor.user_id)
        report_ids = select(StaffProfile.user_id).where(StaffProfile.team_lead_id == actor.user_id)
        clients = select(ClientAssignment.client_id).where(
            or_(
                ClientAssignment.user_id == actor.user_id,
                ClientAssignment.user_id.in_(lead_ids),
                ClientAssignment.user_id.in_(report_ids),
            )
        )
        own_tasks = select(Task.id).where(Task.assigned_to == actor.user_id)
        query = query.where(
            or_(PublishingJob.client_id.in_(clients), Deliverable.task_id.in_(own_tasks))
        )
    if client_id:
        query = query.where(PublishingJob.client_id == client_id)
    if status:
        query = query.where(PublishingJob.status == status)
    rows = (
        await db.execute(
            query.order_by(PublishingJob.scheduled_at.asc().nullslast(), PublishingJob.id)
            .offset(offset)
            .limit(100)
        )
    ).all()
    result = []
    for job, d, client_name in rows:
        try:
            await access(db, actor, d)
        except Forbidden:
            continue
        result.append(
            {
                **serialize(job, d),
                "client_name": client_name,
                "title": f"{job.media_type.title()} · v{d.version}",
            }
        )
    return result
