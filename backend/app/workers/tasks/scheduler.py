"""Beat Scheduler Tasks using transactional concurrency controls.

Uses UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 50) RETURNING
to ensure strictly zero duplicate dispatches across multiple concurrent beat/worker processes.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import uuid
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
    """Atomically claim due scheduled deliverables using FOR UPDATE SKIP LOCKED and recover stale claims."""
    agencies = await _get_active_agencies()
    all_claimed = []
    
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                # Recover stale claims: reset deliverables stranded in 'publishing' for > 30 minutes back to 'scheduled'
                stale_query = text("""
                    UPDATE deliverables
                       SET status = 'scheduled', updated_at = now()
                     WHERE status = 'publishing'
                       AND updated_at < now() - INTERVAL '30 minutes'
                       AND agency_id = :agency_id;
                """)
                await db.execute(stale_query, {"agency_id": str(agency_id)})
                
                # Atomic claim query per CLAUDE.md Invariant 19 and BUILD-PROMPTS.md Phase 6
                query = text("""
                    UPDATE deliverables
                       SET status = 'publishing', updated_at = now()
                     WHERE id IN (
                       SELECT id FROM deliverables
                        WHERE status = 'scheduled'
                          AND scheduled_at <= now()
                          AND agency_id = :agency_id
                        ORDER BY scheduled_at
                        FOR UPDATE SKIP LOCKED
                        LIMIT 50
                     )
                    RETURNING id;
                """)
                res = await db.execute(query, {"agency_id": str(agency_id)})
                claimed_ids = [uuid.UUID(str(row[0])) for row in res.fetchall()]
                await db.commit()

                if claimed_ids:
                    all_claimed.extend(claimed_ids)
                    logger.info(
                        "Agency %s: Claimed %d due deliverables for publishing", agency_id, len(claimed_ids)
                    )
                    from app.workers.tasks.publish import publish_deliverable_task

                    for deliv_id in claimed_ids:
                        try:
                            # Note: Celery tasks should carry agency_id. We must update publish_deliverable_task to accept it.
                            publish_deliverable_task.apply_async((str(deliv_id), str(agency_id)), retry=False)
                        except Exception as e:
                            logger.warning("Could not enqueue publish task via Celery broker: %s. Reverting status to scheduled.", e)
                            revert_query = text("""
                                UPDATE deliverables
                                   SET status = 'scheduled', updated_at = now()
                                 WHERE id = :deliv_id AND status = 'publishing';
                            """)
                            await db.execute(revert_query, {"deliv_id": str(deliv_id)})
                            await db.commit()
    return all_claimed


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


