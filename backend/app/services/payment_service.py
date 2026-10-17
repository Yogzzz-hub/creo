"""Payment service handling orders, confirmations, and replay-resilient webhook processing.

CRITICAL INVARIANT:
A subscription is activated only by evidence the payment gateway signed: either the
webhook for a *successful* payment (process_event) or the checkout signature the browser
returns (confirm_order), verified with the gateway secret. Nothing the client merely
asserts can activate a plan. Admin-approved offline payments are the one other path, and
they require an authenticated admin.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import Conflict, Forbidden, NotFound
from app.core.logging import get_logger
from app.models.billing import PaymentEvent, Plan, Subscription, UsageCounter
from app.models.enums import AccountStatus, DeliverableType, PaymentProvider, SubscriptionStatus, UserRole
from app.models.user import User
from app.schemas.billing import ConfirmPaymentResponse, CreateOrderResponse

logger = get_logger(__name__)


# Gateway events that mean money was actually captured. Anything else (payment.failed,
# order.created, payment.authorized, refunds...) must never activate a subscription.
SUCCESS_EVENT_TYPES = frozenset({
    "payment.captured",
    "order.paid",
    "payment_intent.succeeded",
    "checkout.session.completed",
    "invoice.paid",
})

# Secrets that ship in the repository or tests. They authenticate nothing in production.
_PLACEHOLDER_WEBHOOK_SECRETS = frozenset({
    "webhook_secret_creo-26",
    "test_rzp_webhook_secret_key_12345",
    "whsec_test_stripe_secret_key_12345",
    "fallback_secret",
})


# How long /payments/confirm waits for the gateway webhook when the browser's own signature
# could not be verified.
CONFIRM_POLL_SECONDS = 6.0


def is_production() -> bool:
    return getattr(settings, "ENVIRONMENT", "development") in ("production", "prod")


def verify_checkout_signature(order_id: str | None, payment_id: str | None, signature: str | None) -> bool:
    """Verify the HMAC Razorpay Checkout returns: sha256(secret, "<order_id>|<payment_id>")."""
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not (key_secret and order_id and payment_id and signature):
        return False
    expected = hmac.new(
        key_secret.encode("utf-8"),
        (f"{payment_id}|{order_id}" if order_id.startswith("sub_") else f"{order_id}|{payment_id}").encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def sandbox_confirmation_allowed() -> bool:
    """Local development without gateway keys may confirm without a signature; production never."""
    return not is_production() and not getattr(settings, "RAZORPAY_KEY_SECRET", "")


async def create_order(
    db: AsyncSession,
    client_id: uuid.UUID,
    plan_id: uuid.UUID,
    gateway: PaymentProvider = PaymentProvider.RAZORPAY,
) -> CreateOrderResponse:
    """Generate checkout order and insert subscription in 'incomplete' status."""
    plan_stmt = select(Plan).where(Plan.id == plan_id, Plan.is_active.is_(True))
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    if not plan:
        raise NotFound("Plan not found or inactive", code="PLAN_NOT_FOUND")

    # Validate client_id exists in users table to prevent FK violations
    user_stmt = select(User).where(User.id == client_id).with_for_update()
    existing_user = (await db.execute(user_stmt)).scalar_one_or_none()
    if existing_user and existing_user.role != UserRole.CLIENT:
        raise Forbidden("Only client accounts can authorize a subscription.")
    if not existing_user:
        raise NotFound(f"Client account {client_id} not found", code="CLIENT_NOT_FOUND")

    # Security: If the client has a customized negotiated plan assigned by the agency admin,
    # enforce that customized plan and its authoritative server-side pricing.
    custom_plan_stmt = (
        select(Plan)
        .where(
            Plan.name == f"custom_{client_id.hex[:8]}",
            Plan.is_active.is_(True),
        )
    )
    custom_plan = (await db.execute(custom_plan_stmt)).scalar_one_or_none()
    if custom_plan:
        plan = custom_plan

    if plan.agency_id and plan.agency_id != existing_user.agency_id:
        raise Forbidden("This plan belongs to another agency.")
    now = datetime.now(UTC)
    from app.services.subscription_guard import expire_stale_subscriptions
    await expire_stale_subscriptions(db)
    # The expiry sweep may commit. Reacquire serialization before gateway creation.
    await db.execute(select(User.id).where(User.id == client_id).with_for_update())

    # Option 1: Guard against overlapping active subscriptions.
    # Clients can only select/purchase a new plan once their current retainer expires.
    active_sub_stmt = (
        select(Subscription)
        .where(
            Subscription.client_id == client_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
            Subscription.current_period_end > now,
        )
        .limit(1)
    )
    active_sub = (await db.execute(active_sub_stmt)).scalar_one_or_none()
    if active_sub:
        # If client already has the exact same plan active and we are in production, prevent duplicate purchase
        is_prod = getattr(settings, "ENVIRONMENT", "development") in ("production", "prod")
        if active_sub.plan_id == plan.id and is_prod:
            raise Conflict(
                "You already have this active subscription retainer. You can upgrade or change plans after your current billing cycle expires.",
                code="ACTIVE_SUBSCRIPTION_EXISTS",
                details={
                    "current_subscription_id": str(active_sub.id),
                    "current_period_end": active_sub.current_period_end.isoformat(),
                },
            )

    sub_id = uuid.uuid4()

    key_id = (
        getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_TO2r0YMjDZSpuC")
        if gateway == PaymentProvider.RAZORPAY
        else getattr(settings, "STRIPE_PUBLISHABLE_KEY", "pk_test_creo_demo")
    )

    if gateway == PaymentProvider.RAZORPAY:
        from app.services import razorpay_subscriptions
        if not existing_user.agency_id:
            raise Conflict("Assign the client to an agency before billing.")
        if active_sub:
            raise Conflict("An active subscription already exists. Manage its renewal in Settings.")
        pending = (await db.execute(select(Subscription).where(
            Subscription.client_id == client_id,
            Subscription.status == SubscriptionStatus.INCOMPLETE,
            Subscription.gateway_subscription_id.like("sub_%")
        ).order_by(Subscription.created_at.desc()).limit(1))).scalar_one_or_none()
        if pending:
            remote = await razorpay_subscriptions.fetch(pending.gateway_subscription_id)
            if remote.get("status") in ("created", "authenticated", "active"):
                if pending.plan_id != plan.id or int((pending.gateway_data or {}).get("price_minor", -1)) != plan.price_minor:
                    raise Conflict("A recurring checkout is already open for another plan. Ask your agency to cancel it before choosing a new plan.")
                return CreateOrderResponse(subscription_id=pending.id, gateway=gateway,
                    order_id=pending.gateway_subscription_id, razorpay_subscription_id=pending.gateway_subscription_id,
                    amount_minor=plan.price_minor, currency=plan.currency, key_id=key_id, recurring=True)
        order_id = await razorpay_subscriptions.create(plan, client_id)
    else:
        from app.core.errors import AppError
        raise AppError("This payment gateway is unavailable.",
                       code="PAYMENT_GATEWAY_UNAVAILABLE", status_code=503)

    subscription = Subscription(
        id=sub_id,
        agency_id=existing_user.agency_id,
        gateway_data={"recurring": True, "price_minor": plan.price_minor, "currency": plan.currency, "mandate_status": "created"},
        client_id=client_id,
        plan_id=plan.id,
        status=SubscriptionStatus.INCOMPLETE,
        gateway=gateway,
        gateway_subscription_id=order_id,
        amount=plan.monthly_price,
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db.add(subscription)
    await db.commit()

    return CreateOrderResponse(
        subscription_id=sub_id,
        gateway=gateway,
        order_id=order_id,
        razorpay_subscription_id=order_id,
        recurring=True,
        amount_minor=plan.price_minor,
        currency=plan.currency,
        key_id=key_id,
    )


async def _seed_usage_counters(db: AsyncSession, client_id: uuid.UUID, plan: Plan, now: datetime) -> None:
    """Set this month's quotas to the plan's. Work already used is never taken back, so a
    downgrade mid-month cannot push `used` above `quota` (ck_usage_bounds)."""
    period_start = now.date().replace(day=1)
    if period_start.month == 12:
        period_end = date(period_start.year + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = date(period_start.year, period_start.month + 1, 1) - timedelta(days=1)

    for kind, quota in [
        (DeliverableType.REEL, plan.reel_quota),
        (DeliverableType.CAROUSEL, plan.story_quota),
        (DeliverableType.STATIC_POST, plan.poster_quota),
    ]:
        insert_stmt = pg_insert(UsageCounter).values(
            id=uuid.uuid4(),
            agency_id=plan.agency_id,
            client_id=client_id,
            period_start=period_start,
            period_end=period_end,
            kind=kind,
            quota=quota,
            used=0,
        )
        await db.execute(
            insert_stmt.on_conflict_do_update(
                index_elements=["client_id", "period_start", "kind"],
                set_={
                    "quota": func.greatest(insert_stmt.excluded.quota, UsageCounter.used),
                    "period_end": period_end,
                },
            )
        )


async def _activate_subscription(db: AsyncSession, subscription: Subscription, *, commit: bool = True) -> None:
    """Activate subscription, client account status, and seed monthly quotas. Idempotent."""
    now = datetime.now(UTC)

    # At most one active subscription per client is enforced by a unique index, so the
    # superseded ones must be gone (flushed) before this one becomes active; the order
    # of two UPDATEs in one flush is not defined.
    prev_subs_stmt = select(Subscription).where(
        Subscription.client_id == subscription.client_id,
        Subscription.id != subscription.id,
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
    )
    for prev in (await db.execute(prev_subs_stmt)).scalars().all():
        prev.status = SubscriptionStatus.CANCELED
    await db.flush()

    already_active = subscription.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)
    subscription.status = SubscriptionStatus.ACTIVE
    if not already_active:
        # A repeated confirmation or webhook must not extend a period that was already granted.
        subscription.current_period_start = now
        subscription.current_period_end = now + timedelta(days=30)

    user_stmt = select(User).where(User.id == subscription.client_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user:
        user.account_status = AccountStatus.ACTIVE

    plan_stmt = select(Plan).where(Plan.id == subscription.plan_id)
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    if plan:
        await _seed_usage_counters(db, subscription.client_id, plan, now)
    if commit:
        await db.commit()


async def confirm_order(
    db: AsyncSession,
    order_id: str,
    gateway: PaymentProvider,
    payment_id: str,
    signature: str,
    actor: Any | None = None,
) -> ConfirmPaymentResponse:
    """Verify payment and activate subscription or poll internal database."""
    sub_stmt = select(Subscription).where(
        Subscription.gateway_subscription_id == order_id,
        Subscription.gateway == gateway,
    )
    sub = (await db.execute(sub_stmt.with_for_update() if order_id.startswith("sub_") else sub_stmt)).scalar_one_or_none()
    if not sub:
        raise NotFound("Subscription order not found", code="ORDER_NOT_FOUND")

    # Ownership security: caller must own this subscription or be an agency/platform admin
    if actor:
        caller_role = getattr(actor, "role", "")
        if caller_role not in ("admin", "super_admin", UserRole.ADMIN, UserRole.SUPER_ADMIN):
            caller_id = getattr(actor, "client_id", None) or getattr(actor, "user_id", None)
            if caller_id and sub.client_id != caller_id:
                raise Forbidden("Unauthorized: you cannot confirm a payment order belonging to another client.")

    if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING) and sub.current_period_end > datetime.now(UTC):
        return ConfirmPaymentResponse(status="active", subscription_id=sub.id)

    # Razorpay signature verification (the browser can only produce it for a real payment)
    is_valid_signature = gateway == PaymentProvider.RAZORPAY and verify_checkout_signature(
        order_id, payment_id, signature
    )
    if order_id.startswith("sub_"):
        if not is_valid_signature:
            raise Forbidden("Invalid recurring payment signature.")
        from app.services import razorpay_subscriptions
        remote = await razorpay_subscriptions.fetch(sub.gateway_subscription_id)
        await apply_recurring_payment(db, sub, remote)
        return ConfirmPaymentResponse(status="active", subscription_id=sub.id)
    if is_valid_signature or sandbox_confirmation_allowed():
        await _activate_subscription(db, sub)
        return ConfirmPaymentResponse(status="active", subscription_id=sub.id)

    # Poll internal DB briefly, waiting for the asynchronous webhook
    deadline = asyncio.get_event_loop().time() + CONFIRM_POLL_SECONDS
    while asyncio.get_event_loop().time() < deadline:
        await db.refresh(sub)
        if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
            return ConfirmPaymentResponse(status="active", subscription_id=sub.id)
        await asyncio.sleep(0.5)

    return ConfirmPaymentResponse(status="pending", subscription_id=sub.id)


def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    provider: PaymentProvider,
    secret: str | None = None,
) -> bool:
    """Verify cryptographic HMAC signature of raw webhook payload using constant-time comparison."""
    if not signature:
        return False

    raw_secret = secret or (
        getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "test_rzp_webhook_secret_key_12345")
        if provider == PaymentProvider.RAZORPAY
        else getattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test_stripe_secret_key_12345")
    )
    webhook_secret: str = str(raw_secret or "fallback_secret")
    if is_production() and webhook_secret in _PLACEHOLDER_WEBHOOK_SECRETS:
        # A secret that is public in the repository authenticates nothing: anyone could
        # forge a "payment captured" event. Refuse until a real secret is configured.
        logger.error("webhook_secret_not_configured", provider=provider.value)
        return False

    if provider == PaymentProvider.RAZORPAY:
        expected = hmac.new(
            webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    elif provider == PaymentProvider.STRIPE:
        # Format: t=1614000000,v1=hash
        try:
            parts = dict(pair.split("=", 1) for pair in signature.split(","))
            timestamp = parts.get("t", "")
            sig_v1 = parts.get("v1", "")
            if not timestamp or not sig_v1:
                return False

            payload_to_sign = f"{timestamp}.".encode() + raw_body
            expected = hmac.new(
                webhook_secret.encode(),
                payload_to_sign,
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(expected, sig_v1)
        except Exception as err:
            logger.warning("stripe_signature_parse_error", error=str(err))
            return False

    return False


async def record_and_process_webhook(
    db: AsyncSession,
    provider: PaymentProvider,
    event_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> bool:
    """Record webhook event idempotently using ON CONFLICT DO NOTHING.

    Returns:
        True if newly recorded and processed,
        False if conflict-skipped (already received).
    """
    event_uuid = uuid.uuid4()
    insert_stmt = (
        pg_insert(PaymentEvent)
        .values(
            id=event_uuid,
            provider=provider,
            provider_event_id=event_id,
            event_type=event_type,
            payload=payload,
            signature_valid=True,
            received_at=datetime.now(UTC),
        )
        .on_conflict_do_nothing(index_elements=["provider", "provider_event_id"])
        .returning(PaymentEvent.id)
    )

    result = await db.execute(insert_stmt)
    row = result.fetchone()
    if not row:
        logger.info(
            "webhook_event_conflict_skipped",
            provider=provider.value,
            event_id=event_id,
        )
        existing_stmt = select(PaymentEvent).where(
            PaymentEvent.provider == provider,
            PaymentEvent.provider_event_id == event_id,
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing and existing.processed_at is None:
            logger.info("webhook_event_retry_unprocessed", event_id=event_id)
            await process_event(db, existing.id)
            return True
        await db.commit()
        return False

    inserted_id = row[0]
    await db.commit()

    # Process event in same flow (or via celery task in background)
    await process_event(db, inserted_id)
    return True


async def process_event(db: AsyncSession, event_id: uuid.UUID) -> None:
    """Activate the subscription a *successful* gateway event paid for; ignore every other event."""
    event_stmt = select(PaymentEvent).where(PaymentEvent.id == event_id)
    event = (await db.execute(event_stmt)).scalar_one_or_none()
    if not event or event.processed_at is not None:
        return

    payload = event.payload
    # Extract order_id / gateway_subscription_id
    razorpay_body = payload.get("payload", {})
    order_id = (
        payload.get("order_id")
        or payload.get("data", {}).get("object", {}).get("id")
        or razorpay_body.get("subscription", {}).get("entity", {}).get("id")
        or razorpay_body.get("payment", {}).get("entity", {}).get("subscription_id")
        or razorpay_body.get("payment", {}).get("entity", {}).get("order_id")
        or razorpay_body.get("order", {}).get("entity", {}).get("id")
    )
    client_id_raw = payload.get("client_id") or payload.get("data", {}).get("object", {}).get(
        "client_id"
    )

    subscription: Subscription | None = None
    if order_id:
        sub_stmt = (
            select(Subscription)
            .where(Subscription.gateway_subscription_id == str(order_id), Subscription.gateway == event.provider)
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        subscription = (await db.execute(sub_stmt.with_for_update())).scalar_one_or_none()

    if not subscription and client_id_raw and event.provider != PaymentProvider.RAZORPAY:
        sub_stmt = (
            select(Subscription)
            .where(Subscription.client_id == uuid.UUID(client_id_raw))
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        subscription = (await db.execute(sub_stmt.with_for_update())).scalar_one_or_none()

    now = datetime.now(UTC)
    if subscription and str(subscription.gateway_subscription_id or "").startswith("sub_"):
        from app.services import razorpay_subscriptions
        remote = await razorpay_subscriptions.fetch(subscription.gateway_subscription_id)
        if event.event_type == "subscription.charged":
            await apply_recurring_payment(db, subscription, remote, commit=False)
        else:
            subscription.gateway_data = {**(subscription.gateway_data or {}), "mandate_status": remote.get("status")}
    elif subscription and event.event_type in SUCCESS_EVENT_TYPES:
        await _activate_subscription(db, subscription, commit=False)
    elif subscription:
        logger.info("payment_event_ignored_not_a_capture", event_type=event.event_type, event_id=str(event_id))

    # Mark event processed
    event.processed_at = now
    await db.commit()
    logger.info("payment_event_processed_successfully", event_id=str(event_id))


async def apply_recurring_payment(db, subscription, remote, *, commit=True):
    from app.services import razorpay_subscriptions
    start, end = razorpay_subscriptions.paid_period(remote, subscription.gateway_subscription_id)
    plan = await db.get(Plan, subscription.plan_id)
    if not plan:
        raise NotFound("Subscription plan no longer exists.")
    remote_plan = await razorpay_subscriptions.call("GET", "plans/" + razorpay_subscriptions.identifier(remote["plan_id"], "plan"))
    item = remote_plan.get("item", {})
    expected = subscription.gateway_data or {}
    if item.get("amount") != expected.get("price_minor") or item.get("currency") != expected.get("currency"):
        raise Conflict("Razorpay recurring price does not match the selected plan.")
    previous_end = subscription.current_period_end
    # Stale signed events cannot reactivate an expired or superseded mandate.
    if end <= datetime.now(UTC):
        raise Conflict("This recurring payment covers an expired period.")
    newer = (await db.execute(select(Subscription.id).where(
        Subscription.client_id == subscription.client_id, Subscription.id != subscription.id,
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
        Subscription.created_at > subscription.created_at).limit(1))).scalar_one_or_none()
    if newer:
        raise Conflict("A newer subscription already supersedes this mandate.")
    await _activate_subscription(db, subscription, commit=False)
    if end >= previous_end or not expected.get("paid_count"):
        subscription.current_period_start, subscription.current_period_end = start, end
    else:
        subscription.current_period_end = previous_end
    subscription.gateway_data = {**expected, "mandate_status": remote.get("status"), "paid_count": remote.get("paid_count"), "charge_at": remote.get("charge_at")}
    if commit:
        await db.commit()
