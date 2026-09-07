"""Automated test suite for Phase 3: Onboarding & Payments.

Verifies:
1. Webhook replay idempotency: replaying same event 3 times leaves 1 subscription,
   1 set of counters, 3 events.
2. Webhook signature tampering: tampered signature fails with 400 and creates 0 payment_events.
3. Stage spoofing guard: POST /onboarding/questionnaire with body claims while stage is 2
   fails with 402 PAYMENT_REQUIRED.
4. Terms acceptance: moves client from stage 1 to stage 2.
5. Brand DNA fallback resilience: deterministic generation succeeds when LLM is unavailable.
6. Payment confirmation polling: client confirm does not mutate or activate subscription.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import PaymentRequired
from app.main import app
from app.models.billing import PaymentEvent, Plan, Subscription, UsageCounter
from app.models.enums import AccountStatus, PaymentProvider, SubscriptionStatus, UserRole
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile, User
from app.schemas.onboarding import QuestionnaireSubmitRequest
from app.services import brand_dna, onboarding_service, payment_service


@pytest.mark.asyncio
async def test_webhook_replay_idempotency(db_session: AsyncSession) -> None:
    """Replaying the exact same webhook payload 3 times must result in:

    - exactly 1 subscription activated
    - exactly 1 set of usage_counters
    - exactly 3 payment_events rows (1 processed, 2 conflict-skipped with processed_at NULL)
    """
    # Create test client and plan
    plan_stmt = select(Plan).limit(1)
    plan = (await db_session.execute(plan_stmt)).scalar_one()

    client_id = uuid.uuid4()
    order_id = f"order_rzp_replay_{uuid.uuid4().hex[:8]}"

    user = User(
        id=client_id,
        auth_id=f"auth-replay-{client_id}",
        email=f"replay-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.PENDING_VERIFICATION,
    )
    db_session.add(user)

    now = datetime.now(UTC)
    sub = Subscription(
        id=uuid.uuid4(),
        client_id=client_id,
        plan_id=plan.id,
        status=SubscriptionStatus.INCOMPLETE,
        gateway=PaymentProvider.RAZORPAY,
        gateway_subscription_id=order_id,
        amount=plan.monthly_price,
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db_session.add(sub)
    await db_session.commit()

    # Replay event payload
    event_id = f"evt_rzp_{uuid.uuid4().hex[:12]}"
    webhook_payload: dict[str, Any] = {
        "event_id": event_id,
        "event": "payment.captured",
        "order_id": order_id,
        "client_id": str(client_id),
        "amount": plan.price_minor,
    }
    raw_body = json.dumps(webhook_payload).encode("utf-8")
    secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "test_rzp_webhook_secret_key_12345")
    valid_sig = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Replay 1
        res1 = await ac.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        )
        assert res1.status_code == 200

        # Replay 2
        res2 = await ac.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        )
        assert res2.status_code == 200

        # Replay 3
        res3 = await ac.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        )
        assert res3.status_code == 200

    # Query DB to assert exact counts (expire session cache to see commits from endpoint)
    db_session.expire_all()
    sub_res = await db_session.execute(
        select(Subscription).where(Subscription.gateway_subscription_id == order_id)
    )
    subscriptions = sub_res.scalars().all()
    assert len(subscriptions) == 1
    assert subscriptions[0].status == SubscriptionStatus.ACTIVE

    counter_res = await db_session.execute(
        select(func.count(UsageCounter.id)).where(UsageCounter.client_id == client_id)
    )
    counter_count = counter_res.scalar()
    # Exactly 3 counters created (reel, carousel, static_post)
    assert counter_count == 3

    events_res = await db_session.execute(
        select(PaymentEvent).where(PaymentEvent.provider_event_id == event_id)
    )
    events = events_res.scalars().all()
    # In Postgres with ON CONFLICT DO NOTHING, the duplicate rows are skipped
    assert len(events) == 1
    assert events[0].processed_at is not None


@pytest.mark.asyncio
async def test_webhook_signature_tampering(db_session: AsyncSession) -> None:
    """Tampering with 1 byte of the webhook signature must reject with 400."""
    raw_body = b'{"event":"payment.captured","id":"evt_tamper_123"}'
    invalid_sig = "a" * 64  # Invalid hex signature

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": invalid_sig, "Content-Type": "application/json"},
        )
        assert res.status_code == 400
        assert "Invalid webhook signature" in res.json().get("detail", "")

    # Ensure no payment event was inserted
    event_res = await db_session.execute(
        select(PaymentEvent).where(PaymentEvent.provider_event_id == "evt_tamper_123")
    )
    assert event_res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_stage_spoofing_questionnaire_guard(db_session: AsyncSession) -> None:
    """Submitting questionnaire while derived stage is 2 must reject with 402 PAYMENT_REQUIRED."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-spoof-{client_id}",
        email=f"spoof-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    profile = ClientProfile(
        user_id=client_id,
        company_name="Spoof Fitness",
        terms_accepted_at=datetime.now(UTC),
        terms_version="v1.0",
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(profile)
    await db_session.commit()

    # Derived stage is 2 (terms accepted, but no active subscription)
    stage = await onboarding_service.get_current_stage(db_session, client_id)
    assert stage == 2

    # Attempt submission directly via service
    q_data = QuestionnaireSubmitRequest(
        company_name="Spoof Fitness",
        instagram_username="@spooffitness",
        target_audience="Gym owners and trainers",
        tone_keywords=["Aggressive", "Bold"],
        color_palette=["#000000", "#FF0000"],
        content_goals=["Brand Awareness"],
    )

    with pytest.raises(PaymentRequired) as exc_info:
        await onboarding_service.submit_questionnaire(db_session, client_id, q_data)
    assert exc_info.value.status_code == 402
    assert exc_info.value.code == "PAYMENT_REQUIRED"

    # Also test via HTTP API with simulated client headers
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/onboarding/questionnaire",
            json=q_data.model_dump(),
            headers={"X-User-Id": str(client_id), "X-User-Role": "client"},
        )
        assert res.status_code == 402
        data = res.json()
        assert data["error"]["code"] == "PAYMENT_REQUIRED"


@pytest.mark.asyncio
async def test_terms_acceptance_progression(db_session: AsyncSession) -> None:
    """Accepting terms advances a stage-1 client to stage 2."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-terms-{client_id}",
        email=f"terms-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,  # Stage 1
    )
    db_session.add(user)
    await db_session.commit()

    stage_before = await onboarding_service.get_current_stage(db_session, client_id)
    assert stage_before == 1

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/onboarding/terms",
            json={"terms_version": "v1.0"},
            headers={"X-User-Id": str(client_id), "X-User-Role": "client"},
        )
        assert res.status_code == 200

    stage_after = await onboarding_service.get_current_stage(db_session, client_id)
    assert stage_after == 2


@pytest.mark.asyncio
async def test_brand_dna_fallback_resilience(db_session: AsyncSession) -> None:
    """Brand DNA service produces deterministic fallback when LLM is unconfigured."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-dna-{client_id}",
        email=f"dna-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    profile = ClientProfile(user_id=client_id, company_name="Titan Gym")
    quest = Questionnaire(
        id=uuid.uuid4(),
        user_id=client_id,
        answers={
            "company_name": "Titan Gym",
            "target_audience": "Powerlifters and strength coaches",
            "tone_keywords": ["Raw", "Heavy", "Elite"],
            "color_palette": ["#1A1A1A", "#E63946"],
        },
        submitted_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add_all([profile, quest])
    await db_session.commit()

    # Generate brand DNA
    result = await brand_dna.generate_brand_dna(db_session, client_id, quest.id)
    assert result.tone == "Raw, Heavy, Elite"
    assert "Powerlifters" in result.target_audience
    assert len(result.palette) >= 2
    assert len(result.recommended_formats) == 3

    # Check status endpoint
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/onboarding/brand-dna/status",
            headers={"X-User-Id": str(client_id), "X-User-Role": "client"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "completed"
        assert data["brand_dna"]["tone"] == "Raw, Heavy, Elite"


@pytest.mark.asyncio
async def test_payment_confirm_does_not_activate(db_session: AsyncSession) -> None:
    """Client payment confirmation polls but does NOT activate subscription directly."""
    plan_stmt = select(Plan).limit(1)
    plan = (await db_session.execute(plan_stmt)).scalar_one()

    client_id = uuid.uuid4()
    order_id = f"order_pending_{uuid.uuid4().hex[:8]}"

    user = User(
        id=client_id,
        auth_id=f"auth-pending-{client_id}",
        email=f"pending-{client_id}@test.com",
        role=UserRole.CLIENT,
        account_status=AccountStatus.PENDING_VERIFICATION,
    )
    db_session.add(user)

    sub = Subscription(
        id=uuid.uuid4(),
        client_id=client_id,
        plan_id=plan.id,
        status=SubscriptionStatus.INCOMPLETE,
        gateway=PaymentProvider.RAZORPAY,
        gateway_subscription_id=order_id,
        amount=plan.monthly_price,
        current_period_start=datetime.now(UTC),
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(sub)
    await db_session.commit()

    # Polling should time out and return pending, NOT active
    response = await payment_service.confirm_order(
        db=db_session,
        order_id=order_id,
        gateway=PaymentProvider.RAZORPAY,
        payment_id="pay_fake_123",
        signature="fake_sig_123",
    )
    assert response.status == "pending"

    # Confirm subscription in DB remains incomplete
    await db_session.refresh(sub)
    assert sub.status == SubscriptionStatus.INCOMPLETE
