"""Test suite for server-authoritative subscription expiry and security guards."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.main import app
from app.models.billing import Plan, Subscription
from app.models.enums import AccountStatus, PaymentProvider, SubscriptionStatus, UserRole
from app.models.user import User
from app.services.subscription_guard import check_client_subscription, expire_stale_subscriptions


@pytest.mark.asyncio
async def test_active_subscription_validation():
    """An active unexpired retainer should report is_active=True, is_expired=False, and block duplicate plan order."""
    now = datetime.now(timezone.utc)
    client_id = uuid.uuid4()
    plan_id = uuid.uuid4()

    async with async_session_factory() as db:
        # Create user
        user = User(
            id=client_id,
            auth_id=f"auth_{client_id.hex[:10]}",
            email=f"client_{client_id.hex[:8]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Test Active Client",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        plan = Plan(
            id=plan_id,
            name=f"starter_test_{plan_id.hex[:6]}",
            display_name="Starter Test",
            monthly_price=25000,
            currency="INR",
            price_minor=2500000,
            poster_quota=8,
            reel_quota=4,
            story_quota=10,
        )
        sub = Subscription(
            id=uuid.uuid4(),
            client_id=client_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            gateway=PaymentProvider.RAZORPAY,
            gateway_subscription_id="order_test_123",
            amount=25000,
            current_period_start=now,
            current_period_end=now + timedelta(days=20),
        )
        db.add_all([user, plan, sub])
        await db.commit()

        # Check subscription guard
        result = await check_client_subscription(db, client_id)
        assert result["is_active"] is True
        assert result["is_expired"] is False
        assert result["seconds_remaining"] > 0
        assert result["days_remaining"] == 20


@pytest.mark.asyncio
async def test_expired_subscription_self_healing():
    """A retainer whose current_period_end has passed should self-heal to canceled and report is_expired=True."""
    now = datetime.now(timezone.utc)
    client_id = uuid.uuid4()
    plan_id = uuid.uuid4()

    async with async_session_factory() as db:
        user = User(
            id=client_id,
            auth_id=f"auth_{client_id.hex[:10]}",
            email=f"expired_{client_id.hex[:8]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Test Expired Client",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        plan = Plan(
            id=plan_id,
            name=f"growth_test_{plan_id.hex[:6]}",
            display_name="Growth Test",
            monthly_price=50000,
            currency="INR",
            price_minor=5000000,
            poster_quota=15,
            reel_quota=8,
            story_quota=20,
        )
        sub = Subscription(
            id=uuid.uuid4(),
            client_id=client_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,  # Marked active in DB but past its end date
            gateway=PaymentProvider.RAZORPAY,
            gateway_subscription_id="order_test_expired",
            amount=50000,
            current_period_start=now - timedelta(days=31),
            current_period_end=now - timedelta(seconds=15),
        )
        db.add_all([user, plan, sub])
        await db.commit()

        # Run check
        result = await check_client_subscription(db, client_id)
        assert result["is_active"] is False
        assert result["is_expired"] is True
        assert result["seconds_remaining"] == 0
        assert result["days_remaining"] == 0
        assert result["status"] == "expired"

        # Verify DB row was self-healed to canceled
        db_sub = await db.get(Subscription, sub.id)
        assert db_sub is not None
        assert db_sub.status == SubscriptionStatus.CANCELED


@pytest.mark.asyncio
async def test_security_headers_present():
    """Test that API responses include OWASP security headers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["x-frame-options"] == "DENY"
        assert res.headers["x-xss-protection"] == "1; mode=block"


@pytest.mark.asyncio
async def test_create_order_blocked_when_active_and_allowed_when_expired():
    """Client cannot create overlapping order while active, but can immediately once expired."""
    from app.core.errors import Conflict
    from app.services import payment_service

    now = datetime.now(timezone.utc)
    client_id = uuid.uuid4()
    plan_id = uuid.uuid4()
    new_plan_id = uuid.uuid4()

    async with async_session_factory() as db:
        user = User(
            id=client_id,
            auth_id=f"auth_{client_id.hex[:10]}",
            email=f"client_order_{client_id.hex[:8]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Order Client",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        plan1 = Plan(
            id=plan_id,
            name=f"active_plan_{plan_id.hex[:6]}",
            display_name="Active Plan",
            monthly_price=25000,
            currency="INR",
            price_minor=2500000,
            poster_quota=8,
            reel_quota=4,
            story_quota=10,
        )
        plan2 = Plan(
            id=new_plan_id,
            name=f"new_plan_{new_plan_id.hex[:6]}",
            display_name="New Plan",
            monthly_price=50000,
            currency="INR",
            price_minor=5000000,
            poster_quota=15,
            reel_quota=8,
            story_quota=20,
        )
        sub = Subscription(
            id=uuid.uuid4(),
            client_id=client_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            gateway=PaymentProvider.RAZORPAY,
            gateway_subscription_id="order_active_now",
            amount=25000,
            current_period_start=now,
            current_period_end=now + timedelta(days=10),
        )
        db.add_all([user, plan1, plan2, sub])
        await db.commit()

        # 1. While active: attempting to create an order must raise Conflict
        with pytest.raises(Conflict) as exc_info:
            await payment_service.create_order(
                db=db,
                client_id=client_id,
                plan_id=new_plan_id,
                gateway=PaymentProvider.RAZORPAY,
            )
        assert exc_info.value.code == "ACTIVE_SUBSCRIPTION_EXISTS"

        # 2. Fast forward to expired state
        sub.current_period_end = now - timedelta(minutes=5)
        await db.commit()

        # 3. Once expired: creating an order succeeds
        order = await payment_service.create_order(
            db=db,
            client_id=client_id,
            plan_id=new_plan_id,
            gateway=PaymentProvider.RAZORPAY,
        )
        assert order.order_id is not None
        assert order.amount_minor == 5000000


@pytest.mark.asyncio
async def test_require_active_subscription_rejects_expired():
    """Dependency raises HTTP 402 with code SUBSCRIPTION_EXPIRED for expired client."""
    from fastapi import HTTPException
    from app.core.rbac import Actor
    from app.services.subscription_guard import require_active_subscription

    now = datetime.now(timezone.utc)
    client_id = uuid.uuid4()
    plan_id = uuid.uuid4()

    async with async_session_factory() as db:
        user = User(
            id=client_id,
            auth_id=f"auth_{client_id.hex[:10]}",
            email=f"guard_{client_id.hex[:8]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Guard Client",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        plan = Plan(
            id=plan_id,
            name=f"guard_plan_{plan_id.hex[:6]}",
            display_name="Guard Plan",
            monthly_price=25000,
            currency="INR",
            price_minor=2500000,
            poster_quota=8,
            reel_quota=4,
            story_quota=10,
        )
        sub = Subscription(
            id=uuid.uuid4(),
            client_id=client_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            gateway=PaymentProvider.RAZORPAY,
            gateway_subscription_id="guard_sub",
            amount=25000,
            current_period_start=now - timedelta(days=32),
            current_period_end=now - timedelta(seconds=1),
        )
        db.add_all([user, plan, sub])
        await db.commit()

        actor = Actor(
            user_id=client_id,
            email=user.email,
            role=UserRole.CLIENT,
            client_id=client_id,
        )

        with pytest.raises(HTTPException) as exc_info:
            await require_active_subscription(actor=actor, db=db)
        assert exc_info.value.status_code == 402
        assert exc_info.value.detail["code"] == "SUBSCRIPTION_EXPIRED"

