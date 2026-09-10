"""Server-authoritative subscription guard service.

Provides zero-trust time checking against UTC, database self-healing of expired
subscriptions, and unified route-level enforcement across deliverables, calendar,
and dashboard features.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.billing import Plan, Subscription
from app.models.enums import SubscriptionStatus, UserRole

logger = get_logger("app.services.subscription_guard")


async def expire_stale_subscriptions(db: AsyncSession) -> int:
    """Atomic self-healing: flip all active subscriptions whose period has ended to 'canceled'.

    Uses PostgreSQL server time (NOW() AT TIME ZONE 'utc') to ensure zero dependency
    on any application clock skew.
    """
    sql = text(
        """
        UPDATE subscriptions
        SET status = 'canceled'
        WHERE status IN ('active', 'trialing')
          AND current_period_end <= (NOW() AT TIME ZONE 'utc')
        """
    )
    result = await db.execute(sql)
    affected: int = result.rowcount or 0
    if affected > 0:
        await db.commit()
        logger.info("stale_subscriptions_expired", count=affected)
    return affected


async def check_client_subscription(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> dict[str, Any]:
    """Check subscription state strictly in UTC.

    Returns an authoritative snapshot containing:
    - is_active: True if retainer is valid, unexpired, and in active/trialing state
    - is_expired: True if a subscription exists whose period has ended
    - seconds_remaining: Integer seconds remaining until current_period_end
    - days_remaining: Ceiling integer days remaining
    - server_time_utc: Authoritative server ISO UTC timestamp
    - subscription: Model instance or None
    - plan: Associated Plan model instance or None
    - status: Current authoritative status string
    """
    # 1. Run automatic self-healing first
    await expire_stale_subscriptions(db)

    now_utc = datetime.now(timezone.utc)

    # 2. Query most recent subscription
    stmt = (
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.client_id == client_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        return {
            "has_subscription": False,
            "is_active": False,
            "is_expired": False,
            "seconds_remaining": 0,
            "days_remaining": 0,
            "server_time_utc": now_utc.isoformat(),
            "subscription": None,
            "plan": None,
            "status": "none",
        }

    sub, plan = row

    # 3. Check period end against server UTC
    period_end = sub.current_period_end
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)

    is_time_expired = period_end <= now_utc

    if is_time_expired:
        # If DB still had it as active/trialing, heal it immediately
        if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
            sub.status = SubscriptionStatus.CANCELED
            await db.commit()

        return {
            "has_subscription": True,
            "is_active": False,
            "is_expired": True,
            "seconds_remaining": 0,
            "days_remaining": 0,
            "server_time_utc": now_utc.isoformat(),
            "subscription": sub,
            "plan": plan,
            "status": "expired",
            "current_period_end": period_end.isoformat(),
        }

    # Still valid and in period
    is_active = sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)
    delta = period_end - now_utc
    seconds_remaining = max(0, int(delta.total_seconds()))
    days_remaining = max(0, math.ceil(delta.total_seconds() / 86400))

    return {
        "has_subscription": True,
        "is_active": is_active,
        "is_expired": False,
        "seconds_remaining": seconds_remaining,
        "days_remaining": days_remaining,
        "server_time_utc": now_utc.isoformat(),
        "subscription": sub,
        "plan": plan,
        "status": sub.status.value,
        "current_period_end": period_end.isoformat(),
    }


async def require_active_subscription(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """FastAPI route dependency ensuring client actors have an active, unexpired subscription.

    Staff / admin roles bypass this check.
    Clients with no subscription or an expired subscription receive HTTP 402 Payment Required.
    """
    if actor.role in (
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.TEAM_LEAD,
        UserRole.EDITOR,
        UserRole.DESIGNER,
        UserRole.SALES,
    ):
        return {"authorized": True, "role": actor.role}

    client_id = actor.client_id or actor.user_id
    check = await check_client_subscription(db, client_id)

    if not check["is_active"]:
        detail = (
            "Your creative retainer subscription has expired. Please renew your plan to continue."
            if check["is_expired"]
            else "An active creative retainer subscription is required to perform this action."
        )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "SUBSCRIPTION_EXPIRED" if check["is_expired"] else "PAYMENT_REQUIRED",
                "message": detail,
                "server_time_utc": check["server_time_utc"],
                "status": check["status"],
            },
        )

    return check
