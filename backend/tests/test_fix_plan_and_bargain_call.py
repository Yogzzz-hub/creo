"""Test suite for Admin Fix Plan and Client Plan Bargain Call endpoints."""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import AccountStatus, DeliverableType, SubscriptionStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.user import ClientProfile, User


async def _get_or_create_plan(
    db: AsyncSession,
    name: str,
    display_name: str,
    monthly_price: Decimal,
    posters: int,
    reels: int,
    stories: int,
) -> Plan:
    stmt = select(Plan).where(Plan.name == name)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if not plan:
        plan = Plan(
            id=uuid.uuid4(),
            name=name,
            display_name=display_name,
            price_minor=int(monthly_price * 100),
            currency="INR",
            monthly_price=monthly_price,
            reel_quota=reels,
            poster_quota=posters,
            story_quota=stories,
            revision_rounds=2,
            is_active=True,
        )
        db.add(plan)
        await db.commit()
    return plan


@pytest.mark.asyncio
async def test_admin_can_fix_3_plans_for_client(db_session: AsyncSession) -> None:
    """Admin can fix any of the 3 plans (starter, growth, pro) for a client."""
    # Ensure standard plans exist
    await _get_or_create_plan(db_session, "starter", "Starter Growth", Decimal("25000.00"), 8, 4, 10)
    await _get_or_create_plan(db_session, "growth", "Brand Accelerator", Decimal("50000.00"), 15, 8, 20)
    await _get_or_create_plan(db_session, "pro", "Enterprise Domination", Decimal("95000.00"), 30, 16, 40)

    # 1. Create admin user and client user
    admin_id = uuid.uuid4()
    admin_user = User(
        id=admin_id,
        auth_id=f"auth-admin-{admin_id.hex[:8]}",
        email=f"admin-{admin_id.hex[:8]}@example.com",
        role=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(admin_user)

    client_id = uuid.uuid4()
    client = User(
        id=client_id,
        auth_id=f"auth-client-{client_id.hex[:8]}",
        email=f"client-{client_id.hex[:8]}@example.com",
        full_name="Test Bargain Client",
        role=UserRole.CLIENT,
        account_status=AccountStatus.PENDING_VERIFICATION,
    )
    db_session.add(client)

    profile = ClientProfile(
        user_id=client_id,
        company_name="Test Bargain Co",
    )
    db_session.add(profile)
    await db_session.commit()

    # 2. Setup mock admin client with proper X-User-Id / X-User-Role
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-User-Id": str(admin_id), "X-User-Role": "admin"},
    ) as ac:
        # Test Plan 1: Fix as 'starter'
        resp_starter = await ac.post(
            f"/api/v1/admin/clients/{client_id}/fix-plan",
            json={"plan_name": "starter", "custom_notes": "Agreed Starter Growth via call bargain"},
        )
        assert resp_starter.status_code == 200, resp_starter.text
        data_starter = resp_starter.json()
        assert data_starter["plan_name"] == "starter"
        assert data_starter["quotas"]["reel"] == 4
        assert data_starter["quotas"]["static_post"] == 8

        # Test Plan 2: Fix as 'growth' (Brand Accelerator)
        resp_growth = await ac.post(
            f"/api/v1/admin/clients/{client_id}/fix-plan",
            json={"plan_name": "growth", "custom_notes": "Upgraded to Brand Accelerator"},
        )
        assert resp_growth.status_code == 200, resp_growth.text
        data_growth = resp_growth.json()
        assert data_growth["plan_name"] == "growth"
        assert data_growth["quotas"]["reel"] == 8
        assert data_growth["quotas"]["static_post"] == 15

        # Test Plan 3: Fix as 'pro' (Enterprise Domination)
        resp_pro = await ac.post(
            f"/api/v1/admin/clients/{client_id}/fix-plan",
            json={"plan_name": "pro", "custom_notes": "Enterprise Domination VIP bargain"},
        )
        assert resp_pro.status_code == 200, resp_pro.text
        data_pro = resp_pro.json()
        assert data_pro["plan_name"] == "pro"
        assert data_pro["quotas"]["reel"] == 16
        assert data_pro["quotas"]["static_post"] == 30

    # 3. Assert active subscription exists in DB
    sub_res = await db_session.execute(
        select(Subscription).where(
            Subscription.client_id == client_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
    )
    active_sub = sub_res.scalar_one_or_none()
    assert active_sub is not None

    # 4. Assert client workflow unlocked and onboarding completed
    await db_session.refresh(client)
    await db_session.refresh(profile)
    assert client.account_status == AccountStatus.ACTIVE
    assert profile.onboarding_completed_at is not None


@pytest.mark.asyncio
async def test_client_can_book_plan_bargain_call(db_session: AsyncSession) -> None:
    """Client can request a consultation/bargain call directly from dashboard."""
    admin_id = uuid.uuid4()
    admin_user = User(
        id=admin_id,
        auth_id=f"auth-admin-{admin_id.hex[:8]}",
        email=f"admin-{admin_id.hex[:8]}@example.com",
        role=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(admin_user)

    client_id = uuid.uuid4()
    client = User(
        id=client_id,
        auth_id=f"auth-client-{client_id.hex[:8]}",
        email=f"client-{client_id.hex[:8]}@example.com",
        full_name="Bargain Seeker",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-User-Id": str(client_id), "X-User-Role": "client"},
    ) as ac:
        resp = await ac.post(
            "/api/v1/portal/book-call",
            json={
                "target_topic": "Custom Pricing / Retainer Discount",
                "proposed_offer": "10 reels at ₹35,000/mo",
                "phone_number": "+91 9876543210",
                "preferred_time": "Immediate / ASAP",
                "notes": "Looking to scale our e-commerce brand quickly",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "call_requested"
        assert data["phone"] == "+91 9876543210"

    # Verify audit log created
    audit_res = await db_session.execute(
        select(AuditLog).where(AuditLog.action == "book_bargain_call", AuditLog.actor_id == client_id)
    )
    audit = audit_res.scalar_one_or_none()
    assert audit is not None
    assert audit.to_value["offer"] == "10 reels at ₹35,000/mo"

    # Verify notification created for admin
    notif_res = await db_session.execute(
        select(Notification).where(Notification.user_id == admin_id)
    )
    notif = notif_res.scalar_one_or_none()
    assert notif is not None
    assert "Plan Bargain Call" in notif.title
