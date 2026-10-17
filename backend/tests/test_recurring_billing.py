import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import pytest
from app.config import settings
from app.core.errors import AppError, Conflict, Forbidden
from app.models.enums import UserRole
from app.services import billing_renewal, payment_service, razorpay_subscriptions as gateway
from app.routers import onboarding


def remote(**overrides):
    return {"id": "sub_test123", "plan_id": "plan_test123", "status": "active", "paid_count": 1,
        "current_start": int((datetime.now(UTC)-timedelta(days=1)).timestamp()),
        "current_end": int((datetime.now(UTC)+timedelta(days=29)).timestamp()), **overrides}


def test_recurring_signature_uses_payment_then_server_subscription_id():
    with patch.object(settings, "RAZORPAY_KEY_SECRET", "test-secret"):
        signature = hmac.new(b"test-secret", b"pay_123|sub_456", hashlib.sha256).hexdigest()
        assert payment_service.verify_checkout_signature("sub_456", "pay_123", signature)
        assert not payment_service.verify_checkout_signature("sub_457", "pay_123", signature)
        assert not payment_service.verify_checkout_signature("sub_456", "pay_other", signature)


def test_mandate_authorization_alone_never_grants_paid_access():
    for data in (remote(status="authenticated"), remote(paid_count=0), remote(current_end=None), remote(id="sub_other")):
        with pytest.raises(Conflict):
            gateway.paid_period(data, "sub_test123")


@pytest.mark.asyncio
async def test_offline_claim_cannot_bypass_new_recurring_onboarding():
    with pytest.raises(Conflict) as error:
        await onboarding.create_manual_payment_request(None, None, None)
    assert error.value.code == "AUTOPAY_REQUIRED"


@pytest.mark.asyncio
async def test_checkout_creates_monthly_plan_and_recurring_mandate():
    client_id = uuid.uuid4()
    plan = SimpleNamespace(display_name="Growth", price_minor=3000000, currency="INR")
    with patch.object(gateway, "call", AsyncMock(side_effect=[{"id": "plan_abc"}, {"id": "sub_xyz"}])) as call:
        assert await gateway.create(plan, client_id) == "sub_xyz"
    assert call.await_args_list[0].args[2] == {"period": "monthly", "interval": 1, "item": {"name": "Growth", "amount": 3000000, "currency": "INR"}}
    assert call.await_args_list[1].args[2]["plan_id"] == "plan_abc"
    assert call.await_args_list[1].args[2]["notes"]["creo_client_id"] == str(client_id)


@pytest.mark.asyncio
async def test_provider_pause_requires_confirmation_and_is_reconciled_without_duplicate_change():
    with patch.object(gateway, "fetch", AsyncMock(side_effect=[remote(), remote(status="paused")])) , patch.object(gateway, "call", AsyncMock()) as call:
        assert (await gateway.change("sub_test123", "pause"))["status"] == "paused"
        call.assert_awaited_once_with("POST", "subscriptions/sub_test123/pause", {"pause_at": "now"})
    with patch.object(gateway, "fetch", AsyncMock(return_value=remote(status="paused"))), patch.object(gateway, "call", AsyncMock()) as call:
        await gateway.change("sub_test123", "pause")
        call.assert_not_awaited()
    with patch.object(gateway, "fetch", AsyncMock(return_value=remote())), patch.object(gateway, "call", AsyncMock()):
        with pytest.raises(Conflict):
            await gateway.change("sub_test123", "pause")


@pytest.mark.asyncio
async def test_pending_pause_does_not_change_gateway_billing():
    client = SimpleNamespace(id=uuid.uuid4(), agency_id=uuid.uuid4(), email="client@example.test", full_name="Client")
    sub = SimpleNamespace(id=uuid.uuid4(), current_period_end=datetime.now(UTC)+timedelta(days=10), gateway_data={"mandate_status": "active"})
    db = SimpleNamespace(add=lambda row: None, commit=AsyncMock(), execute=AsyncMock(side_effect=[SimpleNamespace(scalar_one_or_none=lambda: None), SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]))
    with patch.object(billing_renewal, "client_subscription", AsyncMock(return_value=(client,sub))), patch.object(gateway, "change", AsyncMock()) as change:
        result = await billing_renewal.request_pause(db, SimpleNamespace(), "Break")
        assert result["pause_request_status"] == "pending" and not result["is_paused_next_month"]
        change.assert_not_awaited()
        assert sub.gateway_data["mandate_status"] == "active"


@pytest.mark.asyncio
async def test_cross_agency_admin_cannot_approve_pause():
    row = SimpleNamespace(agency_id=uuid.uuid4())
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: row)))
    actor = SimpleNamespace(role=UserRole.ADMIN, agency_id=uuid.uuid4())
    with patch.object(gateway, "change", AsyncMock()) as change:
        with pytest.raises(Forbidden):
            await billing_renewal.review(db, actor, uuid.uuid4(), True)
        change.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("provider_fails", [True, False])
async def test_approval_pauses_provider_only_and_preserves_paid_period(provider_fails):
    end = datetime.fromtimestamp(remote()["current_end"], UTC)
    agency = uuid.uuid4()
    row = SimpleNamespace(id=uuid.uuid4(), agency_id=agency, client_id=uuid.uuid4(), subscription_id=uuid.uuid4(), status="pending", effective_at=end, reason="Break", created_at=datetime.now(UTC))
    sub = SimpleNamespace(current_period_end=end, gateway_subscription_id="sub_test123", gateway_data={"mandate_status": "active"}, status="active")
    db = SimpleNamespace(execute=AsyncMock(side_effect=[SimpleNamespace(scalar_one_or_none=lambda: row), SimpleNamespace(scalar_one=lambda: sub), SimpleNamespace(scalar_one=lambda: row)]), commit=AsyncMock(), add=lambda item: None)
    actor = SimpleNamespace(role=UserRole.ADMIN, agency_id=agency, user_id=uuid.uuid4())
    with patch.object(gateway, "fetch", AsyncMock(return_value=remote(current_end=int(end.timestamp())))), patch.object(gateway, "change", AsyncMock(side_effect=Conflict("unconfirmed") if provider_fails else None, return_value=remote(status="paused"))):
        if provider_fails:
            with pytest.raises(Conflict):
                await billing_renewal.review(db, actor, row.id, True)
            assert row.status == "pending"
            db.commit.assert_not_awaited()
        else:
            await billing_renewal.review(db, actor, row.id, True)
            assert row.status == "approved" and sub.gateway_data["mandate_status"] == "paused"
        assert sub.status == "active" and sub.current_period_end == end
