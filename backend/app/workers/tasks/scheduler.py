"""Beat Scheduler Tasks using transactional concurrency controls.

Publishing jobs remain durable in PostgreSQL. Dispatch is at-least-once;
workers claim under row locks and reconcile uncertain provider results.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import uuid
from datetime import UTC, datetime, timedelta
from collections.abc import Coroutine
from typing import Any, TypeVar

from sqlalchemy import text

from app.db.session import async_session_factory, tenant_session
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

T = TypeVar("T")


def run_async_safe(coro: Coroutine[Any, Any, T]) -> T:
    """Run an async coroutine safely from sync Celery worker threads."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


async def _get_active_agencies() -> list[uuid.UUID]:
    async with async_session_factory() as db:
        res = await db.execute(text("SELECT id FROM agencies WHERE status = 'active'"))
        return [uuid.UUID(str(row[0])) for row in res.fetchall()]


async def dispatch_due_publishes_async() -> list[uuid.UUID]:
    """Enqueue due durable jobs; workers claim under row locks. Legacy rows are untouched."""
    from sqlalchemy import delete, or_, select

    from app.models.publishing import InstagramOAuth, PublishingJob
    from app.workers.tasks.publish import enabled, publish_deliverable_task

    can_publish = enabled()
    claimed = []
    for agency_id in await _get_active_agencies():
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                now = datetime.now(UTC)
                await db.execute(delete(InstagramOAuth).where(InstagramOAuth.expires_at < now))
                if not can_publish:
                    await db.commit()
                    continue
                stmt = (
                    select(PublishingJob.id)
                    .where(
                        PublishingJob.agency_id == agency_id,
                        PublishingJob.status.in_(["scheduled", "processing"]),
                        PublishingJob.scheduled_at <= now + timedelta(minutes=30),
                        or_(
                            PublishingJob.next_attempt_at.is_(None),
                            PublishingJob.next_attempt_at <= now,
                        ),
                        or_(PublishingJob.lease_until.is_(None), PublishingJob.lease_until <= now),
                    )
                    .order_by(PublishingJob.scheduled_at)
                    .limit(100)
                )
                ids = (await db.execute(stmt)).scalars().all()
                await db.commit()
                for job_id in ids:
                    try:
                        publish_deliverable_task.apply_async(
                            (str(job_id), str(agency_id)), retry=False
                        )
                        claimed.append(job_id)
                    except Exception:
                        logger.warning(
                            "Publishing broker unavailable; durable jobs will be retried by beat"
                        )
    return claimed


@celery_app.task(name="app.workers.tasks.scheduler.dispatch_due_publishes_task", queue="default")
def dispatch_due_publishes_task() -> list[str]:
    """Celery Beat scheduled task entrypoint."""
    claimed = run_async_safe(dispatch_due_publishes_async())
    return [str(uid) for uid in claimed]


async def _assign_upcoming_window_async() -> int:
    from app.services.dispatch_engine import assign_upcoming_window
    agencies = await _get_active_agencies()
    total = 0
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                total += await assign_upcoming_window(db, horizon_days=10)
    return total


@celery_app.task(name="app.workers.tasks.scheduler.assign_upcoming_window_task", queue="default")
def assign_upcoming_window_task() -> int:
    """Dispatches tasks entering the 10-day rolling horizon using continuity-first policy."""
    return run_async_safe(_assign_upcoming_window_async())


async def _rebalance_nightly_sweep_async() -> dict[str, int]:
    from app.services.dispatch_engine import rebalance_nightly_sweep
    agencies = await _get_active_agencies()
    totals = {"reassigned": 0, "escalated": 0}
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                res = await rebalance_nightly_sweep(db)
                totals["reassigned"] += res.get("reassigned", 0)
                totals["escalated"] += res.get("escalated", 0)
    return totals


@celery_app.task(name="app.workers.tasks.scheduler.rebalance_nightly_sweep_task", queue="default")
def rebalance_nightly_sweep_task() -> dict[str, int]:
    """Nightly rebalance sweep for unplanned leave, overloaded windows, and SLA risks."""
    return run_async_safe(_rebalance_nightly_sweep_async())


async def _flex_deadline_sweep_async() -> dict[str, int]:
    from app.services.dispatch_engine import flex_deadline_sweep
    agencies = await _get_active_agencies()
    totals = {"converted": 0, "failed": 0}
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                res = await flex_deadline_sweep(db)
                totals["converted"] += res.get("converted", 0)
                totals["failed"] += res.get("failed", 0)
    return totals


@celery_app.task(name="app.workers.tasks.scheduler.flex_deadline_sweep_task", queue="default")
def flex_deadline_sweep_task() -> dict[str, int]:
    """Auto-converts unfilled flex slots past flex_deadline to anchor evergreen."""
    return run_async_safe(_flex_deadline_sweep_async())




async def _recover_brand_enrichment_async() -> int:
    """Recover completed onboarding requests whose AI job was interrupted by restart."""
    from app.services.onboarding_service import _enrich_and_notify_in_background
    recovered = 0
    for agency_id in await _get_active_agencies():
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                rows = (await db.execute(text("""
                    SELECT q.user_id FROM questionnaires q
                    JOIN client_profiles p ON p.user_id = q.user_id
                    WHERE q.agency_id = :agency_id
                      AND p.onboarding_completed_at IS NOT NULL
                      AND q.answers->>'brand_requested_version' IS NOT NULL
                      AND (q.answers->>'brand_generated_version') IS DISTINCT FROM
                          (q.answers->>'brand_requested_version')
                    ORDER BY q.submitted_at LIMIT 20
                """), {"agency_id": agency_id})).all()
                await db.rollback()
                for row in rows:
                    await _enrich_and_notify_in_background(row[0])
                    recovered += 1
    return recovered


@celery_app.task(name="app.workers.tasks.scheduler.recover_brand_enrichment_task", queue="default")
def recover_brand_enrichment_task() -> int:
    return run_async_safe(_recover_brand_enrichment_async())
