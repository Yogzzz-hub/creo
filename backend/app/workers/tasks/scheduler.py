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

from app.db.session import async_session_factory
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


async def dispatch_due_publishes_async() -> list[uuid.UUID]:
    """Atomically claim due scheduled deliverables using FOR UPDATE SKIP LOCKED and recover stale claims."""
    async with async_session_factory() as db:
        # Recover stale claims: reset deliverables stranded in 'publishing' for > 30 minutes back to 'scheduled'
        stale_query = text("""
            UPDATE deliverables
               SET status = 'scheduled', updated_at = now()
             WHERE status = 'publishing'
               AND updated_at < now() - INTERVAL '30 minutes';
        """)
        await db.execute(stale_query)
        await db.commit()

        # Atomic claim query per CLAUDE.md Invariant 19 and BUILD-PROMPTS.md Phase 6
        query = text("""
            UPDATE deliverables
               SET status = 'publishing', updated_at = now()
             WHERE id IN (
               SELECT id FROM deliverables
                WHERE status = 'scheduled'
                  AND scheduled_at <= now()
                ORDER BY scheduled_at
                FOR UPDATE SKIP LOCKED
                LIMIT 50
             )
            RETURNING id;
        """)
        res = await db.execute(query)
        claimed_ids = [uuid.UUID(str(row[0])) for row in res.fetchall()]
        await db.commit()

        if claimed_ids:
            logger.info(
                "Claimed %d due deliverables for publishing: %s", len(claimed_ids), claimed_ids
            )
            from app.workers.tasks.publish import publish_deliverable_task

            for deliv_id in claimed_ids:
                try:
                    publish_deliverable_task.apply_async((str(deliv_id),), retry=False)
                except Exception as e:
                    logger.warning("Could not enqueue publish task via Celery broker: %s. Reverting status to scheduled.", e)
                    revert_query = text("""
                        UPDATE deliverables
                           SET status = 'scheduled', updated_at = now()
                         WHERE id = :deliv_id AND status = 'publishing';
                    """)
                    await db.execute(revert_query, {"deliv_id": deliv_id})
                    await db.commit()

        return claimed_ids


@celery_app.task(name="app.workers.tasks.scheduler.dispatch_due_publishes_task", queue="default")
def dispatch_due_publishes_task() -> list[str]:
    """Celery Beat scheduled task entrypoint."""
    claimed = run_async_safe(dispatch_due_publishes_async())
    return [str(uid) for uid in claimed]


async def _assign_upcoming_window_async() -> int:
    from app.services.dispatch_engine import assign_upcoming_window
    async with async_session_factory() as db:
        return await assign_upcoming_window(db, horizon_days=10)


@celery_app.task(name="app.workers.tasks.scheduler.assign_upcoming_window_task", queue="default")
def assign_upcoming_window_task() -> int:
    """Dispatches tasks entering the 10-day rolling horizon using continuity-first policy."""
    return run_async_safe(_assign_upcoming_window_async())


async def _rebalance_nightly_sweep_async() -> dict[str, int]:
    from app.services.dispatch_engine import rebalance_nightly_sweep
    async with async_session_factory() as db:
        return await rebalance_nightly_sweep(db)


@celery_app.task(name="app.workers.tasks.scheduler.rebalance_nightly_sweep_task", queue="default")
def rebalance_nightly_sweep_task() -> dict[str, int]:
    """Nightly rebalance sweep for unplanned leave, overloaded windows, and SLA risks."""
    return run_async_safe(_rebalance_nightly_sweep_async())


async def _flex_deadline_sweep_async() -> dict[str, int]:
    from app.services.dispatch_engine import flex_deadline_sweep
    async with async_session_factory() as db:
        return await flex_deadline_sweep(db)


@celery_app.task(name="app.workers.tasks.scheduler.flex_deadline_sweep_task", queue="default")
def flex_deadline_sweep_task() -> dict[str, int]:
    """Auto-converts unfilled flex slots past flex_deadline to anchor evergreen."""
    return run_async_safe(_flex_deadline_sweep_async())

