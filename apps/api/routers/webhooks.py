import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.config import settings
from core.database import async_session
from core.exceptions import limiter
from models.addon import Addon
from models.enums import AccountStatus, AddonStatus
from models.subscription import Subscription
from models.user import User
from services.payments import verify_razorpay_signature, verify_stripe_signature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


async def _activate_user_account(db: AsyncSession, user_id: str, subscription_id: str):
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if not user:
        logger.warning("[Webhooks] User %s not found during activation", user_id)
        return

    if user.deleted_at is not None:
        logger.warning("[Webhooks] Skipping activation for soft-deleted user %s", user_id)
        return

    sub_result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        logger.warning("[Webhooks] Subscription %s not found during activation", subscription_id)
        return

    if subscription.status == "active" and user.account_status == AccountStatus.active:
        logger.info("[Webhooks] Subscription %s already active, skipping", subscription_id)
        return

    if user.account_status != AccountStatus.active:
        user.account_status = AccountStatus.active
        db.add(user)

    subscription.status = "active"
    db.add(subscription)

    await db.commit()

    try:
        from routers.auth import revoke_abandoned_cart_tasks
        revoke_abandoned_cart_tasks(user_id)
    except Exception as exc:
        logger.warning("[Webhooks] Failed to revoke abandoned cart tasks for user %s: %s", user_id, exc)


async def _mark_subscription_past_due(db: AsyncSession, subscription_id: str):
    result = await db.execute(
        select(Subscription, User)
        .join(User, User.id == Subscription.user_id)
        .where(Subscription.id == subscription_id)
    )
    row = result.first()

    if not row:
        return

    subscription, user = row

    if user.deleted_at is not None:
        logger.warning("[Webhooks] Skipping past_due for soft-deleted user %s", user.id)
        return

    subscription.status = "past_due"
    db.add(subscription)

    if user.account_status == AccountStatus.active:
        user.account_status = AccountStatus.lapsed
        db.add(user)

    await db.commit()

    from workers.notification_tasks import notify_payment_failure

    first_name = user.full_name.split()[0] if user.full_name else "Valued Client"

    try:
        notify_payment_failure.delay(
            email=user.email,
            phone_number=user.phone,
            first_name=first_name,
        )
        logger.info("[Webhooks] Dispatched payment failure notification for user %s", user.id)
    except Exception as exc:
        logger.error("[Webhooks] Failed to dispatch payment failure Celery task for user %s: %s", user.id, exc)


async def _find_subscription_by_user_id_and_statuses(
    db: AsyncSession, user_id: str, statuses: list[str]
) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(statuses),
        )
    )
    return result.scalar_one_or_none()


async def _find_subscription_by_gateway_id(
    db: AsyncSession, gateway_subscription_id: str
) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(
            Subscription.gateway_subscription_id == gateway_subscription_id
        )
    )
    return result.scalar_one_or_none()


@router.post("/razorpay")
@limiter.limit("100/minute")
async def razorpay_webhook(request: Request):
    payload_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    try:
        event = json.loads(payload_body)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )

    try:
        await run_in_threadpool(verify_razorpay_signature, payload_body, signature)
    except Exception:
        logger.warning("Invalid Razorpay webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    event_type = event.get("event", "")
    payload = event.get("payload", {})

    async with async_session() as db:
        try:
            if event_type == "payment.captured":
                payment_entity = payload.get("payment", {}).get("entity", {})
                notes = payment_entity.get("notes", {})
                user_id = notes.get("user_id", "")
                addon_id = notes.get("addon_id")

                if addon_id:
                    addon_result = await db.execute(
                        select(Addon).where(Addon.id == addon_id)
                    )
                    addon = addon_result.scalar_one_or_none()
                    if addon and addon.status == AddonStatus.pending:
                        addon.status = AddonStatus.approved
                        db.add(addon)
                        await db.commit()
                        logger.info(
                            "Razorpay payment captured: approved addon %s", addon_id
                        )

                elif user_id:
                    subscription = await _find_subscription_by_user_id_and_statuses(
                        db, user_id, ["pending_payment"]
                    )
                    if subscription:
                        await _activate_user_account(
                            db, subscription.user_id, subscription.id
                        )
                        logger.info(
                            "Razorpay payment captured: activated subscription %s", subscription.id
                        )

            elif event_type == "payment.failed":
                payment_entity = payload.get("payment", {}).get("entity", {})
                notes = payment_entity.get("notes", {})
                user_id = notes.get("user_id", "")

                if user_id:
                    subscription = await _find_subscription_by_user_id_and_statuses(
                        db, user_id, ["pending_payment", "active"]
                    )
                    if subscription:
                        await _mark_subscription_past_due(db, subscription.id)
                        logger.info(
                            f"Razorpay payment failed: marked subscription {subscription.id} past_due"
                        )

        except Exception as e:
            logger.error(f"Error processing Razorpay webhook: {e}")
            await db.rollback()
            raise

    return {"status": "ok"}


@router.post("/stripe")
@limiter.limit("100/minute")
async def stripe_webhook(request: Request):
    payload_body = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    try:
        event = await run_in_threadpool(
            verify_stripe_signature, payload_body, sig_header
        )
    except Exception:
        logger.warning("Invalid Stripe webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    async with async_session() as db:
        try:
            if event.type == "invoice.payment_succeeded":
                invoice = event.data.object
                stripe_subscription_id = invoice.subscription

                if stripe_subscription_id:
                    subscription = await _find_subscription_by_gateway_id(
                        db, stripe_subscription_id
                    )

                    if subscription:
                        await _activate_user_account(
                            db, subscription.user_id, subscription.id
                        )
                        logger.info(
                            f"Stripe payment succeeded: activated subscription {subscription.id}"
                        )

            elif event.type == "invoice.payment_failed":
                invoice = event.data.object
                stripe_subscription_id = invoice.subscription

                if stripe_subscription_id:
                    subscription = await _find_subscription_by_gateway_id(
                        db, stripe_subscription_id
                    )

                    if subscription:
                        await _mark_subscription_past_due(db, subscription.id)
                        logger.info(
                            f"Stripe payment failed: marked subscription {subscription.id} past_due"
                        )

        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {e}")
            await db.rollback()
            raise

    return {"status": "ok"}
