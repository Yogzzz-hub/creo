"""Test for admin client plan removal (refund / accidental payment workflow)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import (
    AccountStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    UserRole,
)
from app.models.ops import AuditLog
from app.models.user import ClientProfile, User


@pytest.mark.asyncio
async def test_admin_remove_client_plan(db_session: AsyncSession) -> None:
    """Admin successfully removes client plan: subscription is canceled, quotas zeroed, user not suspended."""
    admin_id = uuid.uuid4()
    client_id = uuid.uuid4()
    plan_id = uuid.uuid4()

    # 0. Create admin user
    admin_user = User(
        id=admin_id,
        auth_id=f"auth-admin-{admin_id}",
        email=f"admin-{admin_id}@example.com",
        role=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(admin_user)

    # 1. Create client user and profile
    client_user = User(
        id=client_id,
        auth_id=f"auth-client-{client_id}",
        email=f"client-{client_id}@example.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client_user)

    client_profile = ClientProfile(
        user_id=client_id,
        company_name="Acme Refund Corp",
    )
    db_session.add(client_profile)

    # 2. Create Plan
    plan = Plan(
        id=plan_id,
        name=f"growth-{uuid.uuid4().hex[:6]}",
        display_name="Growth Tier",
        price_minor=15000000,
        monthly_price=Decimal("150000.00"),
        reel_quota=8,
        story_quota=12,
        poster_quota=6,
        is_active=True,
    )
    db_session.add(plan)

    # 3. Create active subscription
    now = datetime.now(UTC)
    sub = Subscription(
        id=uuid.uuid4(),
        client_id=client_id,
        plan_id=plan_id,
        status=SubscriptionStatus.ACTIVE,
        gateway=PaymentProvider.RAZORPAY,
        amount=Decimal("150000.00"),
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db_session.add(sub)

    # 4. Create usage counter
    counter = UsageCounter(
        id=uuid.uuid4(),
        client_id=client_id,
        period_start=now.date(),
        period_end=(now + timedelta(days=30)).date(),
        kind=DeliverableType.REEL,
        quota=8,
        used=2,
    )
    db_session.add(counter)
    await db_session.commit()

    # 5. Call remove-plan endpoint as Admin
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/admin/clients/{client_id}/remove-plan",
            json={"reason": "Customer accidentally subscribed, processed full refund"},
            headers={
                "X-User-Id": str(admin_id),
                "X-User-Role": "admin",
            },
        )

    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    body = res.json()
    assert body["status"] == "plan_removed"
    assert body["client_id"] == str(client_id)
    assert body["cancelled_subscriptions"] == 1

    # 6. Verify database state
    await db_session.refresh(sub)
    assert sub.status == SubscriptionStatus.CANCELED

    await db_session.refresh(counter)
    assert counter.quota == 0
    assert counter.used == 0

    await db_session.refresh(client_user)
    # User must NOT be suspended
    assert client_user.account_status == AccountStatus.ACTIVE

    # Verify audit log
    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity == "client_subscription",
            AuditLog.entity_id == client_id,
            AuditLog.action == "client_plan_removed",
        )
    )
    audit = audit_res.scalar_one_or_none()
    assert audit is not None
    assert audit.actor_id == admin_id


@pytest.mark.asyncio
async def test_non_admin_cannot_remove_plan() -> None:
    """Non-admin actors get 403 Forbidden."""
    random_client = uuid.uuid4()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/admin/clients/{random_client}/remove-plan",
            headers={
                "X-User-Id": str(uuid.uuid4()),
                "X-User-Role": "client",
            },
        )
    assert res.status_code == 403
