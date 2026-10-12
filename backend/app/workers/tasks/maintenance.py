"""Maintenance worker tasks: token refreshes, KPI refresh, SLA sweep, reports."""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, text

from app.db.session import async_session_factory
from app.models.enums import AccountStatus, UserRole
from app.models.user import ClientProfile, User
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


import uuid
from app.db.session import tenant_session

async def _get_active_agencies() -> list[uuid.UUID]:
    async with async_session_factory() as db:
        res = await db.execute(text("SELECT id FROM agencies WHERE status = 'active'"))
        return [uuid.UUID(str(row[0])) for row in res.fetchall()]


async def refresh_expiring_ig_async() -> int:
    """Verify Facebook grants; expired consent requires client reauthorization."""
    from app.config import settings
    from app.services.instagram_connection import configured, verify

    if not configured() or settings.INSTAGRAM_CLIENT_MODE != "real":
        return 0
    count = 0
    for agency_id in await _get_active_agencies():
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                ids = (
                    (
                        await db.execute(
                            select(ClientProfile.user_id)
                            .join(User, User.id == ClientProfile.user_id)
                            .where(
                                User.agency_id == agency_id,
                                ClientProfile.ig_connection_status == "connected",
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                for client_id in ids:
                    profile = (
                        await db.execute(
                            select(ClientProfile)
                            .where(ClientProfile.user_id == client_id)
                            .with_for_update()
                        )
                    ).scalar_one()
                    await verify(db, profile)
                    count += 1
    return count


async def refresh_kpis_async() -> str:
    """Refresh materialized view mv_exec_kpis concurrently."""
    async with async_session_factory() as db:
        async with tenant_session(db, agency_id=None, is_platform_admin=True):
            try:
                await db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exec_kpis;"))
                await db.commit()
                return "ok"
            except Exception as e:
                logger.error("Failed to refresh mv_exec_kpis concurrently: %s", e)
                return f"error: {e!s}"


async def sla_breach_sweep_async() -> int:
    """Run idempotent SLA breach monitor."""
    agencies = await _get_active_agencies()
    total_breaches = 0
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                breaches = await breach_sweep(db)
                total_breaches += len(breaches)
    return total_breaches


async def expire_stale_onboarding_async() -> int:
    """Mark accounts as LAPSED if onboarding deadline has passed without completion."""
    now = datetime.now(UTC)
    agencies = await _get_active_agencies()
    total_stale = 0
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
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
                total_stale += len(stale_users)
    logger.info("Marked %d stale accounts as LAPSED across all agencies", total_stale)
    return total_stale


async def weekly_client_reports_async() -> int:
    """Generate and dispatch weekly summary reports for all active clients."""
    agencies = await _get_active_agencies()
    total_reports = 0
    for agency_id in agencies:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                stmt = select(User).where(
                    User.account_status == AccountStatus.ACTIVE,
                    User.role == UserRole.CLIENT,
                )
                res = await db.execute(stmt)
                clients = res.scalars().all()

                for c in clients:
                    try:
                        msg = (
                            "Your weekly social media content report has been updated in your portal."
                        )
                        # send_notification_async was updated to take agency_id
                        await send_notification_async(
                            user_id=c.id,
                            title="Your Weekly Performance Digest",
                            message=msg,
                            agency_id=agency_id,
                            channel="in_app",
                        )
                    except Exception as e:
                        logger.warning("Failed to send weekly report for client %s: %s", c.id, e)
                total_reports += len(clients)

    return total_reports


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
