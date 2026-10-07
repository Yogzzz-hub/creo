"""Pricing changes must preserve the client's onboarding and usage history."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.rbac import Actor
from app.models.billing import Subscription, UsageCounter
from app.models.enums import AccountStatus, UserRole
from app.models.user import ClientProfile, User
from app.routers.admin import FixClientPlanRequest, fix_client_plan
from app.core.errors import PaymentRequired
from app.services.dispatch_engine import draft_month_calendar, distribute_quota_slots


def workflow(completed_at=None, used=0):
    client_id, agency_id = uuid.uuid4(), uuid.uuid4()
    # Use the real model: company_name lives on ClientProfile, never on User.
    user = User(id=client_id, agency_id=agency_id, role=UserRole.CLIENT,
                email="workflow@example.com", account_status=AccountStatus.ACTIVE)
    profile = ClientProfile(user_id=client_id, company_name="Workflow Test",
                            onboarding_completed_at=completed_at)
    counters = [SimpleNamespace(used=used, quota=10, period_end=None), None, None]
    results = [profile, None, None, *counters]
    db = SimpleNamespace(
        get=AsyncMock(side_effect=[user, None]),
        execute=AsyncMock(side_effect=[
            SimpleNamespace(scalar_one_or_none=lambda value=value: value) for value in results
        ]),
        add=MagicMock(), flush=AsyncMock(), commit=AsyncMock(),
    )
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.SUPER_ADMIN, agency_id=agency_id)
    return client_id, agency_id, profile, counters, db, actor


@pytest.mark.asyncio
@pytest.mark.parametrize("completed_at", [None, datetime(2026, 9, 1, tzinfo=UTC)])
async def test_negotiated_price_preserves_onboarding_and_usage(completed_at):
    client_id, agency_id, profile, counters, db, actor = workflow(completed_at, used=3)
    result = await fix_client_plan(client_id, FixClientPlanRequest(
        custom_price=Decimal("42000.50"), custom_reel_quota=8,
        custom_poster_quota=12, custom_story_quota=15,
    ), db, actor)
    assert result["monthly_price"] == 42000.50
    assert result["plan_display_name"] == "Custom Retainer (Workflow Test)"
    assert result["quotas"] == {"reel": 8, "static_post": 12, "carousel": 15}
    assert profile.onboarding_completed_at == completed_at
    assert counters[0].used == 3
    assert counters[0].quota == 8
    added = [call.args[0] for call in db.add.call_args_list]
    subscription = next(item for item in added if isinstance(item, Subscription))
    assert subscription.amount == Decimal("42000.50")
    assert subscription.agency_id == agency_id
    assert all(item.agency_id == agency_id for item in added if isinstance(item, UsageCounter))
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_quota_downgrade_cannot_erase_already_consumed_deliverables():
    client_id, _, _, counters, db, actor = workflow(used=7)
    with pytest.raises(HTTPException) as error:
        await fix_client_plan(client_id, FixClientPlanRequest(custom_reel_quota=4), db, actor)
    assert error.value.status_code == 409
    assert counters[0].used == 7
    assert counters[0].quota == 10
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("quota_field", ["custom_poster_quota", "custom_story_quota"])
async def test_single_format_custom_quota_selects_custom_package(quota_field):
    client_id, _, _, _, db, actor = workflow()
    result = await fix_client_plan(client_id, FixClientPlanRequest(
        plan_name="starter", **{quota_field: 6},
    ), db, actor)
    assert result["is_custom"] is True
    kind = "static_post" if quota_field == "custom_poster_quota" else "carousel"
    assert result["quotas"][kind] == 6


@pytest.mark.asyncio
async def test_staff_account_cannot_receive_a_client_subscription():
    client_id, _, _, _, db, actor = workflow()
    db.get = AsyncMock(return_value=SimpleNamespace(role=UserRole.EDITOR))
    with pytest.raises(HTTPException) as error:
        await fix_client_plan(client_id, FixClientPlanRequest(), db, actor)
    assert error.value.status_code == 400
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_calendar_without_paid_subscription_never_deletes_or_invents_slots():
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(first=lambda: None)),
                         get=AsyncMock(), add=MagicMock(), commit=AsyncMock())
    with pytest.raises(PaymentRequired):
        await draft_month_calendar(db, uuid.uuid4())
    assert db.execute.await_count == 1
    db.get.assert_not_awaited()
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_full_month_calendar_uses_negotiated_quotas_and_client_identity():
    client_id, agency_id = uuid.uuid4(), uuid.uuid4()
    subscription = SimpleNamespace(agency_id=agency_id, created_at=datetime(2025, 1, 1, tzinfo=UTC))
    plan = SimpleNamespace(reel_quota=13, poster_quota=17, story_quota=40)
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[SimpleNamespace(first=lambda: (subscription, plan)), None]),
        get=AsyncMock(return_value=None), add=MagicMock(), commit=AsyncMock(),
    )
    slots = await draft_month_calendar(db, client_id, date(2026, 10, 1))
    assert {kind: sum(slot.slot_kind == kind for slot in slots)
            for kind in ("reel", "poster", "story")} == {"reel": 13, "poster": 17, "story": 40}
    assert all(slot.client_id == client_id and slot.agency_id == agency_id for slot in slots)
    assert all(date(2026, 10, 1) <= slot.publish_date <= date(2026, 10, 31) for slot in slots)
    assert all(slot.status == "draft" and slot.deliverable_id is None for slot in slots)
    db.commit.assert_awaited_once()


@pytest.mark.parametrize("quota", [0, 1, 8, 31, 40, 100, 500])
def test_calendar_distribution_retains_all_quota_even_in_short_window(quota):
    slots = distribute_quota_slots(date(2026, 10, 30), date(2026, 10, 31), quota, [1, 3])
    assert len(slots) == quota
    assert len(set(slots)) == quota
    assert all(date(2026, 10, 30) <= day <= date(2026, 10, 31) for day, _ in slots)


@pytest.mark.asyncio
async def test_production_registration_cannot_claim_email_sent_when_provider_fails():
    from app.routers.auth import _deliver_otp_or_raise

    with patch("app.routers.auth.settings", SimpleNamespace(ENVIRONMENT="production", ALLOW_FALLBACK_OTP=True)), \
         patch("app.routers.auth.send_otp_email", new=AsyncMock(return_value=False)), \
         patch("app.routers.auth.logger") as logger:
        with pytest.raises(HTTPException) as error:
            await _deliver_otp_or_raise("workflow@example.com", "123456")
    assert error.value.status_code == 503
    logger.warning.assert_not_called()
