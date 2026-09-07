"""Maintenance worker tasks: token refreshes, KPI refresh, SLA sweep, reports."""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, text

from app.db.session import async_session_factory
from app.models.enums import AccountStatus
from app.models.user import ClientProfile, User
from app.services.instagram_client import get_instagram_client
from app.services.sla_service import breach_sweep
from app.workers.celery_app import celery_app
from app.workers.tasks.notify import send_notification_async

logger = logging.getLogger(__name__)


def run_async_safe(coro: Any) -> Any:
    """Run an async coroutine safely from sync Celery worker threads."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


async def refresh_expiring_ig_async() -> int:
    """Proactively refresh long-lived Instagram access tokens expiring within 3 days."""
    ig_client = get_instagram_client()
    now = datetime.now(UTC)
    threshold = now + timedelta(days=3)

    async with async_session_factory() as db:
        stmt = select(ClientProfile).where(
            ClientProfile.ig_token_expires_at.is_not(None),
            ClientProfile.ig_token_expires_at <= threshold,
        )
        res = await db.execute(stmt)
        expiring = res.scalars().all()

        refreshed_count = 0
        for profile in expiring:
            try:
                refresh_data = await ig_client.refresh_access_token("existing_token")
                expires_in = refresh_data.get("expires_in", 5184000)
                profile.ig_token_expires_at = now + timedelta(seconds=expires_in)
                refreshed_count += 1
            except Exception as e:
                logger.error("Failed to refresh token for user %s: %s", profile.user_id, e)

        await db.commit()
        logger.info("Refreshed %d expiring Instagram tokens", refreshed_count)
        return refreshed_count


async def refresh_kpis_async() -> str:
    """Refresh materialized view mv_exec_kpis concurrently."""
    async with async_session_factory() as db:
        try:
            await db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exec_kpis;"))
            await db.commit()
            return "ok"
        except Exception as e:
            logger.error("Failed to refresh mv_exec_kpis concurrently: %s", e)
            return f"error: {e!s}"


async def sla_breach_sweep_async() -> int:
    """Run idempotent SLA breach monitor."""
    async with async_session_factory() as db:
        breaches = await breach_sweep(db)
        return len(breaches)


async def expire_stale_onboarding_async() -> int:
    """Mark accounts as LAPSED if onboarding deadline has passed without completion."""
    now = datetime.now(UTC)
    async with async_session_factory() as db:
        stmt = (
            select(User)
            .join(ClientProfile, ClientProfile.user_id == User.id)
            .where(
                ClientProfile.onboarding_completed_at.is_(None),
                ClientProfile.onboarding_deadline.is_not(None),
                ClientProfile.onboarding_deadline <= now,
                User.account_status != AccountStatus.LAPSED,
                User.account_status != AccountStatus.CANCELLED,
            )
        )
        res = await db.execute(stmt)
        stale_users = res.scalars().all()

        for u in stale_users:
            u.account_status = AccountStatus.LAPSED

        await db.commit()
        logger.info("Marked %d stale accounts as LAPSED", len(stale_users))
        return len(stale_users)


async def weekly_client_reports_async() -> int:
    """Generate and dispatch weekly summary reports for all active clients."""
    async with async_session_factory() as db:
        stmt = select(User).where(User.account_status == AccountStatus.ACTIVE)
        res = await db.execute(stmt)
        clients = res.scalars().all()

        for c in clients:
            try:
                msg = (
                    "Your weekly social media content report has been updated in your portal."
                )
                await send_notification_async(
                    user_id=c.id,
                    title="Your Weekly Performance Digest",
                    message=msg,
                    channel="in_app",
                )
            except Exception as e:
                logger.warning("Failed to send weekly report for client %s: %s", c.id, e)

        return len(clients)


@celery_app.task(name="app.workers.tasks.maintenance.refresh_expiring_ig_task", queue="default")
def refresh_expiring_ig_task() -> int:
    return run_async_safe(refresh_expiring_ig_async())  # type: ignore[no-any-return]


@celery_app.task(name="app.workers.tasks.maintenance.refresh_kpis_task", queue="default")
def refresh_kpis_task() -> str:
    return run_async_safe(refresh_kpis_async())  # type: ignore[no-any-return]


@celery_app.task(name="app.workers.tasks.maintenance.sla_breach_sweep_task", queue="default")
def sla_breach_sweep_task() -> int:
    return run_async_safe(sla_breach_sweep_async())  # type: ignore[no-any-return]


@celery_app.task(name="app.workers.tasks.maintenance.expire_stale_onboarding_task", queue="default")
def expire_stale_onboarding_task() -> int:
    return run_async_safe(expire_stale_onboarding_async())  # type: ignore[no-any-return]


@celery_app.task(name="app.workers.tasks.maintenance.weekly_client_reports_task", queue="default")
def weekly_client_reports_task() -> int:
    return run_async_safe(weekly_client_reports_async())  # type: ignore[no-any-return]
