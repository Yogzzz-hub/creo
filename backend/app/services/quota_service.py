"""Quota service — atomic consumption and release of usage_counters.

Enforces per-client monthly quotas for deliverable kinds (reel, carousel, static_post).
All operations are single atomic SQL statements to prevent race conditions under concurrent load.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import QuotaExceeded
from app.models.enums import DeliverableType


async def consume(db: AsyncSession, client_id: uuid.UUID, kind: DeliverableType) -> None:
    """Atomically increment usage counter if quota is not exhausted.

    Uses a single UPDATE ... WHERE used < quota RETURNING to prevent TOCTOU races.
    Raises QuotaExceeded if the counter is full.

    Args:
        db: Async database session.
        client_id: The client whose quota to consume.
        kind: The deliverable type (reel, carousel, static_post, etc.)

    Raises:
        QuotaExceeded: When the client has used all their quota for the period.
        ValueError: When no usage_counter row exists for this client/kind/period.
    """
    today = date.today()
    effective_kind = DeliverableType.CAROUSEL if kind == DeliverableType.STORY else kind
    stmt = text("""
        UPDATE usage_counters
           SET used = used + 1
         WHERE client_id = :client_id
           AND kind = :kind
           AND period_start <= :today
           AND period_end >= :today
           AND used < quota
        RETURNING used, quota
    """)
    result = await db.execute(
        stmt,
        {"client_id": client_id, "kind": effective_kind.value, "today": today},
    )
    row = result.fetchone()
    if row is None:
        # Either quota is exhausted (used >= quota) or no counter row exists
        # Distinguish by checking what the current state is
        check_stmt = text("""
            SELECT used, quota
              FROM usage_counters
             WHERE client_id = :client_id
               AND kind = :kind
               AND period_start <= :today
               AND period_end >= :today
        """)
        check_res = await db.execute(
            check_stmt,
            {"client_id": client_id, "kind": effective_kind.value, "today": today},
        )
        counter_row = check_res.fetchone()
        if counter_row is not None:
            used, quota = counter_row
            raise QuotaExceeded(
                f"Monthly {kind.value} quota exhausted ({used}/{quota})",
                code="QUOTA_EXHAUSTED",
                details={
                    "kind": kind.value,
                    "used": used,
                    "quota": quota,
                    "remaining": 0,
                },
            )

        # Check if the client has an active subscription and auto-seed the monthly counters
        from app.services.subscription_guard import check_client_subscription
        sub_check = await check_client_subscription(db, client_id)
        if sub_check.get("is_active") and sub_check.get("plan"):
            plan = sub_check["plan"]
            from datetime import timedelta
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            from app.models.billing import UsageCounter

            period_start = today.replace(day=1)
            if period_start.month == 12:
                period_end = date(period_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = date(period_start.year, period_start.month + 1, 1) - timedelta(days=1)

            for k, q in [
                (DeliverableType.REEL, plan.reel_quota),
                (DeliverableType.CAROUSEL, plan.story_quota),
                (DeliverableType.STATIC_POST, plan.poster_quota),
            ]:
                c_stmt = (
                    pg_insert(UsageCounter)
                    .values(
                        id=uuid.uuid4(),
                        client_id=client_id,
                        period_start=period_start,
                        period_end=period_end,
                        kind=k,
                        quota=q,
                        used=0,
                    )
                    .on_conflict_do_nothing(index_elements=["client_id", "period_start", "kind"])
                )
                await db.execute(c_stmt)
            await db.commit()

            # Retry atomic increment
            retry_res = await db.execute(
                stmt,
                {"client_id": client_id, "kind": effective_kind.value, "today": today},
            )
            retry_row = retry_res.fetchone()
            if retry_row is not None:
                await db.commit()
                return

        # No active subscription or uninitialized counter
        raise QuotaExceeded(
            f"No usage counter found for {kind.value} — ensure subscription is active",
            code="QUOTA_NOT_INITIALIZED",
            details={"kind": kind.value, "client_id": str(client_id)},
        )
    await db.commit()


async def release(db: AsyncSession, client_id: uuid.UUID, kind: DeliverableType) -> None:
    """Atomically decrement usage counter (for cancellations). Guarded by used > 0.

    Args:
        db: Async database session.
        client_id: The client whose quota to release.
        kind: The deliverable type to release.
    """
    today = date.today()
    effective_kind = DeliverableType.CAROUSEL if kind == DeliverableType.STORY else kind
    stmt = text("""
        UPDATE usage_counters
           SET used = used - 1
         WHERE client_id = :client_id
           AND kind = :kind
           AND period_start <= :today
           AND period_end >= :today
           AND used > 0
        RETURNING used
    """)
    result = await db.execute(
        stmt,
        {"client_id": client_id, "kind": effective_kind.value, "today": today},
    )
    if result.fetchone() is None:
        # used was already 0, ignore silently — idempotent cancellation
        return
    await db.commit()


def current_period() -> tuple[date, date]:
    """Return (start, end) of the current billing period (calendar month)."""
    today = datetime.now(UTC).date()
    start = today.replace(day=1)
    # End = last day of the month
    if today.month == 12:
        end = date(today.year + 1, 1, 1).replace(day=1)
    else:
        end = date(today.year, today.month + 1, 1)
    import calendar

    last_day = calendar.monthrange(today.year, today.month)[1]
    end = today.replace(day=last_day)
    return start, end


async def initialize_quotas_for_client(db: AsyncSession, client_id: uuid.UUID) -> None:
    """Initialize usage counters for a client, called during onboarding completion."""
    from app.services.subscription_guard import check_client_subscription
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.models.billing import UsageCounter
    from datetime import timedelta

    sub_check = await check_client_subscription(db, client_id)
    if sub_check.get("is_active") and sub_check.get("plan"):
        plan = sub_check["plan"]
        today = date.today()
        period_start = today.replace(day=1)
        if period_start.month == 12:
            period_end = date(period_start.year + 1, 1, 1) - timedelta(days=1)
        else:
            period_end = date(period_start.year, period_start.month + 1, 1) - timedelta(days=1)

        for k, q in [
            (DeliverableType.REEL, plan.reel_quota),
            (DeliverableType.CAROUSEL, plan.story_quota),
            (DeliverableType.STATIC_POST, plan.poster_quota),
        ]:
            c_stmt = (
                pg_insert(UsageCounter)
                .values(
                    id=uuid.uuid4(),
                    client_id=client_id,
                    period_start=period_start,
                    period_end=period_end,
                    kind=k,
                    quota=q,
                    used=0,
                )
                .on_conflict_do_nothing(index_elements=["client_id", "period_start", "kind"])
            )
            await db.execute(c_stmt)


async def reconcile_usage_counters(db: AsyncSession, client_id: uuid.UUID | None = None) -> None:
    """Reconcile usage counters against actual sent deliverables."""
    client_param = {"client_id": client_id} if client_id else {}
    sql = text(f"""
        UPDATE usage_counters uc
        SET used = LEAST(uc.quota, GREATEST(0, COALESCE(sub.sent_count, 0))),
            updated_at = NOW()
        FROM (
            SELECT d.client_id, 
                   COALESCE(t.deliverable_type::text, CASE WHEN d.file_type LIKE '%video%' OR d.file_type LIKE '%mp4%' THEN 'reel' WHEN d.file_type LIKE '%story%' THEN 'carousel' ELSE 'static_post' END) as kind,
                   COUNT(DISTINCT d.root_id) as sent_count
            FROM deliverables d
            LEFT JOIN tasks t ON t.id = d.task_id
            WHERE d.status IN ('pending_approval', 'revision_requested', 'approved', 'scheduled', 'publishing', 'published')
            {"AND d.client_id = :client_id" if client_id else ""}
            GROUP BY d.client_id, kind
        ) sub
        WHERE uc.client_id = sub.client_id
          AND (uc.kind::text = sub.kind OR (sub.kind = 'carousel' AND uc.kind::text = 'story'))
          AND uc.period_start <= CURRENT_DATE
          AND uc.period_end >= CURRENT_DATE
          {"AND uc.client_id = :client_id" if client_id else ""};
    """)
    await db.execute(sql, client_param)
    await db.commit()


async def get_client_quotas(db: AsyncSession, client_id: uuid.UUID) -> dict[str, dict[str, int]]:
    """Return dictionary of current quotas, used, and remaining for a client."""
    today = date.today()
    from app.models.billing import UsageCounter
    from sqlalchemy import select

    stmt = select(UsageCounter).where(
        UsageCounter.client_id == client_id,
        UsageCounter.period_start <= today,
        UsageCounter.period_end >= today,
    )
    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        await initialize_quotas_for_client(db, client_id)
        rows = (await db.execute(stmt)).scalars().all()

    res = {}
    for uc in rows:
        k = uc.kind.value if hasattr(uc.kind, "value") else str(uc.kind)
        res[k] = {
            "quota": uc.quota,
            "used": uc.used,
            "remaining": max(0, uc.quota - uc.used),
        }
    return res


