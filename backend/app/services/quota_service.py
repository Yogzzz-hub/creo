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
        {"client_id": client_id, "kind": kind.value, "today": today},
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
            {"client_id": client_id, "kind": kind.value, "today": today},
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
        # No row at all — this shouldn't happen in normal flow after payment activation
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
        {"client_id": client_id, "kind": kind.value, "today": today},
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
