import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import async_session
from models.enums import AccountStatus
from models.subscription import Subscription
from models.user import User
from services.payments import verify_razorpay_signature, verify_stripe_signature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


async def _get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def _activate_user_account(db: AsyncSession, user_id: str, subscription_id: str):
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if user and user.account_status != AccountStatus.active:
        user.account_status = AccountStatus.active
        db.add(user)

    sub_result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = sub_result.scalar_one_or_none()

    if subscription:
        subscription.status = "active"
        db.add(subscription)

    await db.commit()


async def _mark_subscription_past_due(db: AsyncSession, subscription_id: str):
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = "past_due"
        db.add(subscription)
        await db.commit()


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
async def razorpay_webhook(request: Request):
    payload_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    try:
        verify_razorpay_signature(payload_body, signature)
    except Exception:
        logger.warning("Invalid Razorpay webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    try:
        import json
        event = json.loads(payload_body)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )

    event_type = event.get("event", "")
    payload = event.get("payload", {})

    async with async_session() as db:
        try:
            if event_type == "payment.captured":
                payment_entity = payload.get("payment", {}).get("entity", {})
                notes = payment_entity.get("notes", {})
                subscription_id = notes.get("subscription_id", "")

                if subscription_id:
                    subscription = await _find_subscription_by_gateway_id(db, subscription_id)
                    if subscription:
                        await _activate_user_account(
                            db, subscription.user_id, subscription.id
                        )
                        logger.info(
                            f"Razorpay payment captured: activated subscription {subscription.id}"
                        )

            elif event_type == "payment.failed":
                payment_entity = payload.get("payment", {}).get("entity", {})
                notes = payment_entity.get("notes", {})
                subscription_id = notes.get("subscription_id", "")

                if subscription_id:
                    subscription = await _find_subscription_by_gateway_id(db, subscription_id)
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
async def stripe_webhook(request: Request):
    payload_body = await request.body()
    signature_header = request.headers.get("Stripe-Signature", "")

    if not signature_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    parts = signature_header.split(",")
    timestamp = None
    signature = None
    for part in parts:
        if part.startswith("t="):
            timestamp = part[2:]
        elif part.startswith("v1="):
            signature = part[3:]

    if not timestamp or not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe-Signature format",
        )

    try:
        event = verify_stripe_signature(payload_body, signature, timestamp)
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
                stripe_customer_id = invoice.customer
                stripe_subscription_id = invoice.subscription

                if stripe_subscription_id:
                    result = await db.execute(
                        select(Subscription).where(
                            Subscription.gateway_subscription_id == stripe_subscription_id
                        )
                    )
                    subscription = result.scalar_one_or_none()

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
                    result = await db.execute(
                        select(Subscription).where(
                            Subscription.gateway_subscription_id == stripe_subscription_id
                        )
                    )
                    subscription = result.scalar_one_or_none()

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
