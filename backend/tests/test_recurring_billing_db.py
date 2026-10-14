"""Real PostgreSQL transaction tests; only a disposable *_test database is allowed."""
import os
import uuid
import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch
import pytest

if "test" not in os.environ.get("DATABASE_URL", "").rsplit("/", 1)[-1]:
    pytest.skip("requires a disposable PostgreSQL test database", allow_module_level=True)

from sqlalchemy import select
from app.config import settings
from app.db.session import AsyncSessionLocal, tenant_session
from app.core.rbac import Actor
from app.models.tenant import Agency
from app.models.user import User
from app.models.billing import Plan, Subscription, SubscriptionPauseRequest
from app.models.enums import UserRole, AccountStatus, PaymentProvider
from app.services import payment_service, billing_renewal, razorpay_subscriptions as gateway


@pytest.mark.asyncio
async def test_checkout_first_payment_renewal_and_admin_pause_are_provider_confirmed():
    agency_id = uuid.uuid4()
    client_id, admin_id, plan_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    remote_id = "sub_" + uuid.uuid4().hex
    now = datetime.now(UTC)
    remote = {"id": remote_id, "plan_id": "plan_realtest", "status": "active", "paid_count": 1,
        "current_start": int(now.timestamp()), "current_end": int((now+timedelta(days=31)).timestamp())}
    async with AsyncSessionLocal() as db, tenant_session(db, agency_id=agency_id):
        db.add(Agency(id=agency_id, name="Billing Test", slug=uuid.uuid4().hex))
        await db.flush()
        db.add_all([User(id=client_id, agency_id=agency_id, email=uuid.uuid4().hex+"@example.test", auth_id=uuid.uuid4().hex, role=UserRole.CLIENT, account_status=AccountStatus.ACTIVE),
                    User(id=admin_id, agency_id=agency_id, email=uuid.uuid4().hex+"@example.test", auth_id=uuid.uuid4().hex, role=UserRole.ADMIN, account_status=AccountStatus.ACTIVE),
                    Plan(id=plan_id, agency_id=agency_id, name=uuid.uuid4().hex[:12], display_name="Growth", price_minor=3000000, monthly_price=Decimal("30000"), currency="INR")])
        await db.commit()
        actor = Actor(user_id=client_id, role=UserRole.CLIENT, agency_id=agency_id)
        admin = Actor(user_id=admin_id, role=UserRole.ADMIN, agency_id=agency_id)
        with patch.object(settings, "RAZORPAY_KEY_SECRET", "recurring-test-secret"), \
             patch.object(gateway, "create", AsyncMock(return_value=remote_id)), \
             patch.object(gateway, "fetch", AsyncMock(side_effect=lambda _: dict(remote))), \
             patch.object(gateway, "call", AsyncMock(return_value={"item": {"amount": 3000000, "currency": "INR"}})):
            checkout = await payment_service.create_order(db, client_id, plan_id)
            assert checkout.recurring and checkout.razorpay_subscription_id == remote_id
            repeated = await payment_service.create_order(db, client_id, plan_id)
            assert repeated.subscription_id == checkout.subscription_id
            signature = hmac.new(b"recurring-test-secret", ("pay_first|"+remote_id).encode(), hashlib.sha256).hexdigest()
            confirmed = await payment_service.confirm_order(db, remote_id, PaymentProvider.RAZORPAY, "pay_first", signature, actor)
            assert confirmed.status == "active"
            sub = await db.get(Subscription, checkout.subscription_id)
            assert sub.current_period_end == datetime.fromtimestamp(remote["current_end"], UTC)
            first_end = sub.current_period_end
            # A second distinct monthly capture extends to the provider's period,
            # while a replay keeps that exact period rather than adding 30 days.
            remote.update(paid_count=2, current_start=remote["current_end"], current_end=int((now+timedelta(days=61)).timestamp()))
            await payment_service.apply_recurring_payment(db, sub, remote)
            renewed_end = sub.current_period_end
            assert renewed_end > first_end
            await payment_service.apply_recurring_payment(db, sub, remote)
            assert sub.current_period_end == renewed_end
            event_id = "evt_" + uuid.uuid4().hex
            payload = {"event": "subscription.charged", "payload": {"subscription": {"entity": {"id": remote_id}}}}
            assert await payment_service.record_and_process_webhook(db, PaymentProvider.RAZORPAY, event_id, "subscription.charged", payload)
            assert not await payment_service.record_and_process_webhook(db, PaymentProvider.RAZORPAY, event_id, "subscription.charged", payload)
            await db.refresh(sub)
            assert sub.current_period_end == renewed_end
            with patch.object(gateway, "change", AsyncMock(return_value={**remote, "status": "paused"})) as change:
                result = await billing_renewal.request_pause(db, actor, "Holiday")
                assert result["pause_request_status"] == "pending"
                change.assert_not_awaited()
                row = (await db.execute(select(SubscriptionPauseRequest).where(SubscriptionPauseRequest.subscription_id == sub.id))).scalar_one()
                approved = await billing_renewal.review(db, admin, row.id, True)
                assert approved["status"] == "approved"
                change.assert_awaited_once_with(remote_id, "pause")
                assert sub.status == "active" and sub.current_period_end == renewed_end
                assert sub.gateway_data["mandate_status"] == "paused"
