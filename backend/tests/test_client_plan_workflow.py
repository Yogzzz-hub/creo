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
from app.services.dispatch_engine import assign_pod, distribute_balanced_slots, approve_calendar_month
from app.core.errors import Conflict
from app.models.enums import DeliverableType
from app.models.work import Task


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
        execute=AsyncMock(side_effect=[SimpleNamespace(first=lambda: (subscription, plan)), None, SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]),
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


def test_daily_cadence_spreads_all_formats_without_losing_entitlement():
    loads = {}
    slots = []
    for quota in (12, 20, 30):
        slots += distribute_balanced_slots(date(2026, 10, 14), date(2026, 10, 31), quota, [1, 3], loads)
    assert len(slots) == 62
    assert len(loads) == 18
    assert max(loads.values()) - min(loads.values()) <= 1
    assert len(set(slots)) == 62


@pytest.mark.asyncio
async def test_initial_month_does_not_silently_reduce_paid_quotas():
    sub = SimpleNamespace(agency_id=None, created_at=datetime(2026, 10, 7, tzinfo=UTC))
    plan = SimpleNamespace(reel_quota=12, poster_quota=20, story_quota=30)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[SimpleNamespace(first=lambda: (sub, plan)), None, SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]),
                         get=AsyncMock(return_value=None), add=MagicMock(), commit=AsyncMock())
    slots = await draft_month_calendar(db, uuid.uuid4(), date(2026, 10, 1))
    assert len(slots) == 62
    assert min(slot.publish_date for slot in slots) == date(2026, 10, 14)
    assert len({slot.publish_date for slot in slots}) == 30
    assert max(slot.publish_date for slot in slots) == date(2026, 11, 12)


@pytest.mark.asyncio
async def test_admin_assignment_is_not_reused_as_creative_team_lead():
    agency_id = uuid.uuid4()
    client = SimpleNamespace(agency_id=agency_id)
    admin = SimpleNamespace(role=UserRole.ADMIN, account_status="active", agency_id=agency_id)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(scalar_one=lambda: client),
        SimpleNamespace(all=lambda: [(SimpleNamespace(role="team_lead"), admin)]),
        SimpleNamespace(fetchall=lambda: []),
    ]), add=MagicMock(), commit=AsyncMock())
    with pytest.raises(Conflict) as error:
        await assign_pod(db, uuid.uuid4())
    assert error.value.code == "POD_UNAVAILABLE"
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_story_calendar_slot_materializes_story_task():
    client_id = uuid.uuid4()
    slot = SimpleNamespace(agency_id=None, publish_date=date(2026, 11, 10), slot_kind="story",
                           concept_status="approved", blueprint=None)
    results = [SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [slot])),
               SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]
    db = SimpleNamespace(execute=AsyncMock(side_effect=results), add=MagicMock(), commit=AsyncMock())
    await approve_calendar_month(db, client_id, dispatch_immediately=False)
    tasks = [call.args[0] for call in db.add.call_args_list if isinstance(call.args[0], Task)]
    assert len(tasks) == 1
    assert tasks[0].deliverable_type == DeliverableType.STORY


@pytest.mark.asyncio
async def test_completed_onboarding_retry_revalidates_legacy_pod():
    from app.services.onboarding_service import complete_onboarding

    client_id = uuid.uuid4()
    profile = SimpleNamespace(onboarding_completed_at=datetime(2026, 10, 1, tzinfo=UTC))
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: profile)))
    with patch("app.services.dispatch_engine.assign_pod", new=AsyncMock(side_effect=Conflict("Missing genuine lead", code="POD_UNAVAILABLE"))) as allocator:
        with pytest.raises(Conflict) as error:
            await complete_onboarding(db, client_id)
    assert error.value.code == "POD_UNAVAILABLE"
    allocator.assert_awaited_once_with(db, client_id)


@pytest.mark.asyncio
@pytest.mark.parametrize("quotas", [(12, 20, 30), (8, 12, 10), (4, 8, 10)])
async def test_posting_cycle_includes_weekends_without_inventing_assets(quotas):
    sub = SimpleNamespace(agency_id=None, created_at=datetime(2026, 10, 7, tzinfo=UTC),
                          current_period_start=datetime(2026, 10, 7, tzinfo=UTC))
    plan = SimpleNamespace(reel_quota=quotas[0], poster_quota=quotas[1], story_quota=quotas[2])
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(first=lambda: (sub, plan)), None,
        SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]),
        get=AsyncMock(return_value=None), add=MagicMock(), commit=AsyncMock())
    slots = await draft_month_calendar(db, uuid.uuid4(), date(2026, 10, 7))
    assert len(slots) == sum(quotas)
    assert tuple(sum(slot.slot_kind == kind for slot in slots)
                 for kind in ("reel", "poster", "story")) == quotas
    days = {slot.publish_date for slot in slots}
    assert all(date(2026, 10, 14) <= day <= date(2026, 11, 12) for day in days)
    if sum(quotas) >= 30:
        assert len(days) == 30
        assert {5, 6}.issubset({day.weekday() for day in days})
    else:
        assert len(days) == sum(quotas)


@pytest.mark.asyncio
async def test_rebuilding_drafts_preserves_locked_assets_and_counts_legacy_formats():
    sub = SimpleNamespace(agency_id=None, created_at=datetime(2026, 10, 7, tzinfo=UTC),
                          current_period_start=datetime(2026, 10, 7, tzinfo=UTC))
    plan = SimpleNamespace(reel_quota=8, poster_quota=12, story_quota=10)
    retained = SimpleNamespace(slot_kind="static_post", publish_date=date(2026, 10, 14),
                               is_locked=True, deliverable_id=uuid.uuid4())
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(first=lambda: (sub, plan)), None,
        SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [retained]))]),
        get=AsyncMock(return_value=None), add=MagicMock(), commit=AsyncMock())
    slots = await draft_month_calendar(db, uuid.uuid4(), date(2026, 10, 7))
    assert retained in slots
    assert retained.is_locked and retained.deliverable_id is not None
    assert len(slots) == 30
    assert len({slot.publish_date for slot in slots}) == 30
    assert sum(slot.slot_kind == "poster" for slot in slots) == 11


@pytest.mark.asyncio
async def test_accepting_negotiation_applies_actual_price_preserving_quotas():
    from app.routers.admin import NegotiationActionPayload, update_plan_negotiation
    client_id, agency_id = uuid.uuid4(), uuid.uuid4()
    neg = SimpleNamespace(id=uuid.uuid4(), client_id=client_id, client_name="Client",
                          notes="Requested price", target_topic="Retainer", status="Pending Review")
    current = SimpleNamespace(reel_quota=8, poster_quota=12, story_quota=10, display_name="Client plan")
    db = SimpleNamespace(get=AsyncMock(return_value=neg),
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: current)),
        add=MagicMock(), commit=AsyncMock())
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.SUPER_ADMIN, agency_id=agency_id)
    with patch("app.routers.admin.fix_client_plan", new=AsyncMock()) as apply:
        result = await update_plan_negotiation(neg.id,
            NegotiationActionPayload(action="accept", agreed_price=Decimal("35000")), actor, db)
    args = apply.await_args
    assert args.args[0] == client_id
    assert args.args[1].custom_price == Decimal("35000")
    assert (args.args[1].custom_reel_quota, args.args[1].custom_poster_quota,
            args.args[1].custom_story_quota) == (8, 12, 10)
    assert result["new_status"] == "Accepted"


@pytest.mark.asyncio
async def test_razorpay_order_uses_clients_saved_custom_price():
    from app.models.billing import Plan
    from app.services.payment_service import create_order
    client_id = uuid.uuid4()
    standard = Plan(id=uuid.uuid4(), name="growth", monthly_price=Decimal("50000"), price_minor=5000000,
                    currency="INR", reel_quota=10, poster_quota=16, story_quota=22)
    custom = Plan(id=uuid.uuid4(), name=f"custom_{client_id.hex[:8]}", monthly_price=Decimal("35000.50"), price_minor=3500050,
                  currency="INR", reel_quota=8, poster_quota=12, story_quota=10)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(scalar_one_or_none=lambda value=value: value)
        for value in (standard, SimpleNamespace(id=client_id), custom, None)]),
        add=MagicMock(), commit=AsyncMock())
    with patch("app.services.subscription_guard.expire_stale_subscriptions", new=AsyncMock()), \
         patch("app.services.razorpay_orders.create_razorpay_order", new=AsyncMock(return_value="order_verified_test")) as order:
        result = await create_order(db, client_id, standard.id)
    assert order.await_args.args[2:] == (3500050, "INR")
    assert result.amount_minor == 3500050
    assert db.add.call_args.args[0].plan_id == custom.id


@pytest.mark.parametrize("quotas", [dict(reel=10, poster=16, story=22),
                                    dict(reel=12, poster=20, story=30)])
def test_ops_calendar_covers_full_cycle_with_exact_plan_quotas(quotas):
    from app.services.calendar_engine import distribute_sequenced_slots
    slots = distribute_sequenced_slots(date(2026, 10, 14), date(2026, 11, 12),
                                      date(2026, 10, 18), quotas, {})
    assert len({slot["date"] for slot in slots}) == 30
    assert {kind: sum(slot["kind"] == kind for slot in slots)
            for kind in quotas} == quotas
