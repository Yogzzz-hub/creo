"""Durable Instagram publishing worker. No implicit publishing of legacy deliverables."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.config import settings
from app.db.session import async_session_factory, tenant_session
from app.models.billing import Subscription
from app.models.enums import AccountStatus, SubscriptionStatus
from app.models.publishing import PublishingJob
from app.models.user import User
from app.models.work import Deliverable
from app.services import instagram_connection as connection
from app.services import publishing_service as publishing
from app.services.instagram_client import InstagramError, get_instagram_client
from app.services.instagram_login import client_for_provider
from app.services.instagram_media import inspect_media
from app.workers.celery_app import celery_app


def enabled() -> bool:
    return (
        settings.INSTAGRAM_PUBLISHING_ENABLED
        and settings.INSTAGRAM_CLIENT_MODE == "real"
        and (connection.configured() or connection.configured("instagram"))
    )


async def eligible(db, job, d, profile, *, preparing=True):
    await db.refresh(d)
    client = await db.get(User, job.client_id)
    if (
        not client
        or client.agency_id != job.agency_id
        or client.account_status != AccountStatus.ACTIVE
    ):
        raise InstagramError("Client account is not active.", "CLIENT_INACTIVE")
    if d.client_id != job.client_id or (d.agency_id and d.agency_id != job.agency_id):
        raise InstagramError("Client ownership does not match this job.", "OWNERSHIP_MISMATCH")
    sub = (
        await db.execute(
            select(Subscription.id)
            .where(
                Subscription.client_id == job.client_id,
                Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
                Subscription.current_period_end > datetime.now(UTC),
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if not sub:
        raise InstagramError("Client subscription is not active.", "SUBSCRIPTION_INACTIVE")
    if not publishing.approved(job, d):
        raise InstagramError(
            "This exact media version and caption require client approval.", "APPROVAL_REQUIRED"
        )
    if (
        profile.ig_connection_status != "connected"
        or profile.ig_connection_id != job.connection_id
        or profile.instagram_user_id != job.instagram_account_id
    ):
        raise InstagramError(
            "Instagram connection changed. Review the account and reschedule.",
            "RECONNECT_REQUIRED",
            reconnect=True,
        )
    if profile.ig_token_expires_at and profile.ig_token_expires_at <= datetime.now(UTC):
        raise InstagramError(
            "Instagram authorization expired. Reconnect.", "RECONNECT_REQUIRED", reconnect=True
        )
    if not job.scheduled_at or job.scheduled_at > datetime.now(UTC) + (timedelta(minutes=30) if preparing else timedelta()):
        raise InstagramError("This publishing schedule is not due.", "NOT_DUE")
    return connection.unseal(profile.ig_token_encrypted)


async def locked(db, job_id, client_id):
    # All connection edits, schedules and worker phases lock profile BEFORE job.
    profile = await publishing.lock_profile(db, client_id)
    job = (
        await db.execute(
            select(PublishingJob)
            .where(PublishingJob.id == job_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    return profile, job


async def fail(db, job, profile, exc):
    # Count failed attempts once; processing polls do not consume the retry budget.
    job.attempts += 1
    job.last_attempt_at = datetime.now(UTC)
    if exc.ambiguous or job.stage == "submitting":
        job.status = "uncertain"
    elif exc.reconnect:
        job.status = "paused"
        changed = profile.ig_connection_status != "reconnect_required"
        profile.ig_connection_status = "reconnect_required"
        await connection.pause_jobs(db, profile, str(exc))
        if changed:
            await connection.notify_connection(
                db, profile, "Instagram reconnection required", str(exc)
            )
    elif exc.retryable and job.attempts < 5:
        job.status = "scheduled"
        job.next_attempt_at = datetime.now(UTC) + timedelta(
            seconds=max(exc.retry_after, min(3600, 60 * 2**job.attempts))
        )
    else:
        job.status = "failed"
    job.last_error, job.error_code = str(exc), exc.code
    job.lease_id, job.lease_until = None, None
    await publishing.audit(db, job, "attempt_failed")
    if job.status != "scheduled":
        await publishing.notify(db, job, "Instagram publishing needs attention", str(exc))
    await db.commit()


async def execute_publish_job(job_id: uuid.UUID, agency_id: uuid.UUID) -> dict:
    if not enabled():
        return {"status": "disabled"}
    provider = get_instagram_client()
    async with async_session_factory() as db:
        async with tenant_session(db, agency_id=agency_id):
            initial = await db.get(PublishingJob, job_id)
            if not initial or initial.agency_id != agency_id:
                return {"status": "not_found"}
            client_id = initial.client_id
            profile, job = await locked(db, job_id, client_id)
            now = datetime.now(UTC)
            if job.status not in ("scheduled", "processing", "uncertain"):
                return {"status": job.status}
            if job.lease_until and job.lease_until > now:
                return {"status": "already_claimed"}
            if job.status != "uncertain" and (
                not job.scheduled_at
                or job.scheduled_at > now + timedelta(minutes=30)
                or (job.next_attempt_at and job.next_attempt_at > now)
            ):
                return {"status": "not_due"}
            d = await db.get(Deliverable, job.deliverable_id)
            if not d:
                return {"status": "not_found"}
            uncertain = job.stage == "submitting" or job.status == "uncertain"
            if (
                not uncertain
                and job.stage == "new"
                and job.attempts == 0
                and now - job.scheduled_at
                > timedelta(minutes=settings.INSTAGRAM_MAX_LATENESS_MINUTES)
            ):
                job.status, job.last_error = (
                    "needs_schedule",
                    "The scheduled time was missed. Choose a new future time.",
                )
                await publishing.audit(db, job, "missed_schedule")
                await publishing.notify(db, job, "Instagram schedule needs review", job.last_error)
                await db.commit()
                return {"status": job.status}
            try:
                if uncertain:
                    # Reconciliation only reads Meta. It remains possible after approval or
                    # subscription changes, or a reconnect to the same Instagram account.
                    if profile.instagram_user_id != job.instagram_account_id:
                        raise InstagramError(
                            "Reconnect the original Instagram account to reconcile this "
                            "publication.",
                            "RECONNECT_REQUIRED",
                            reconnect=True,
                        )
                    credentials = connection.unseal(profile.ig_token_encrypted)
                else:
                    credentials = await eligible(db, job, d, profile)
                if credentials.get("provider") == "instagram":
                    provider = client_for_provider("instagram")
                await provider.verify_account(
                    job.instagram_account_id, (profile.ig_metadata or {}).get("page_id", ""), credentials
                )
                token = credentials["page_token"]
                if uncertain:
                    # Never call media_publish again after a possibly accepted request.
                    state = (
                        await provider.get_container_status(job.container_id, token)
                        if job.container_id
                        else "UNKNOWN"
                    )
                    if state == "PUBLISHED":
                        job.status, job.stage, job.published_at = (
                            "published",
                            "confirmed_container",
                            now,
                        )
                        job.last_error, job.error_code = None, None
                        await publishing.audit(db, job, "provider_reconciled")
                        await publishing.notify(
                            db,
                            job,
                            "Content published to Instagram",
                            "Meta confirmed publication. The media link was not returned; no "
                            "duplicate post was sent.",
                        )
                    else:
                        job.status = "uncertain"
                        job.last_error = (
                            "Meta has not confirmed publication. Administrative review is "
                            "required; automatic retry is blocked."
                        )
                    job.lease_id, job.lease_until = None, None
                    await db.commit()
                    return {"status": job.status}
                quota = await provider.get_content_publishing_limit(job.instagram_account_id, token)
                if quota["quota_usage"] >= quota["quota_total"]:
                    raise InstagramError(
                        "Instagram publishing quota is reached. Retrying later.",
                        "RATE_LIMITED",
                        retryable=True,
                        retry_after=3600,
                    )
                job.status = "processing"
                job.last_attempt_at = now
                lease = uuid.uuid4()
                job.lease_id, job.lease_until = lease, now + timedelta(minutes=5)
                await publishing.audit(db, job, "attempt_started")
                await db.commit()
                # Persist claim, then take the same locks and revalidate immediately before I/O.
                profile, job = await locked(db, job_id, client_id)
                if job.lease_id != lease or job.status != "processing":
                    return {"status": "claim_changed"}
                credentials = await eligible(db, job, d, profile)
                if not job.container_id:
                    url, meta = await inspect_media(d.file_url, job.media_type)
                    if not job.media_metadata or meta["sha256"] != job.media_metadata.get("sha256"):
                        raise InstagramError(
                            "The approved media bytes changed. Schedule and request fresh "
                            "approval.",
                            "MEDIA_CHANGED",
                        )
                    job.container_id = await provider.create_media_container(
                        job.instagram_account_id,
                        job.media_type,
                        url,
                        job.caption,
                        access_token=credentials["page_token"],
                        is_video=meta["is_video"],
                    )
                    job.container_created_at, job.stage = datetime.now(UTC), "container"
                    await publishing.audit(db, job, "container_created")
                    await db.commit()  # Container creation is NOT publication.
                    profile, job = await locked(db, job_id, client_id)
                    if job.lease_id != lease or job.status != "processing":
                        return {"status": "claim_changed"}
                    await eligible(db, job, d, profile)
                state = await provider.get_container_status(
                    job.container_id, credentials["page_token"]
                )
                if state == "IN_PROGRESS":
                    if datetime.now(UTC) - job.container_created_at > timedelta(minutes=30):
                        raise InstagramError(
                            "Meta processing took over 30 minutes. Review the asset before "
                            "rescheduling.",
                            "PROCESSING_TIMEOUT",
                        )
                    job.next_attempt_at = datetime.now(UTC) + timedelta(seconds=60)
                    job.lease_id, job.lease_until = None, None
                    await db.commit()
                    return {"status": "processing"}
                if state != "FINISHED":
                    raise InstagramError(
                        "Meta could not prepare this media. Check export requirements.",
                        "CONTAINER_FAILED",
                    )
                if job.scheduled_at > datetime.now(UTC):
                    job.stage = "ready"
                    job.status = "scheduled"
                    job.next_attempt_at = job.scheduled_at
                    job.lease_id, job.lease_until = None, None
                    await db.commit()
                    return {"status": "ready"}
                job.stage = "submitting"
                await publishing.audit(db, job, "publish_submitting")
                await (
                    db.commit()
                )  # A crash from here onwards requires reconciliation, never re-publication.
                profile, job = await locked(db, job_id, client_id)
                if job.lease_id != lease or job.status != "processing":
                    return {"status": "claim_changed"}
                credentials = await eligible(db, job, d, profile, preparing=False)
                try:
                    result = await provider.publish_container(
                        job.instagram_account_id, job.container_id, credentials["page_token"]
                    )
                except InstagramError as exc:
                    if not exc.ambiguous:
                        # A definite rejection is safe to record as failed/paused. A crash
                        # before this is committed still takes the conservative reconcile path.
                        job.stage = "container"
                    raise
                job.media_id, job.published_at = result["media_id"], datetime.now(UTC)
                job.status, job.stage = "published", "confirmed"
                job.lease_id, job.lease_until = None, None
                job.last_error, job.error_code = None, None
                await publishing.audit(db, job, "published")
                await publishing.notify(
                    db,
                    job,
                    "Content published to Instagram",
                    "Meta confirmed publication of your approved content.",
                )
                await db.commit()
                try:
                    job.permalink = await provider.media_permalink(
                        job.media_id, credentials["page_token"]
                    )
                    await db.commit()
                except InstagramError:
                    pass
                return {"status": "published", "media_id": job.media_id}
            except InstagramError as exc:
                await fail(db, job, profile, exc)
                return {"status": job.status}
            # Unexpected/DB errors deliberately escape. Persisted leases and submitting stage
            # make restart recovery safe. Never log provider payloads or tokens.


@celery_app.task(
    name="app.workers.tasks.publish.publish_deliverable_task",
    queue="publish",
    acks_late=True,
    reject_on_worker_lost=True,
)
def publish_deliverable_task(job_id: str, agency_id: str | None = None) -> dict:
    if not agency_id:
        return {"status": "legacy_job_disabled"}
    return asyncio.run(execute_publish_job(uuid.UUID(job_id), uuid.UUID(agency_id)))
