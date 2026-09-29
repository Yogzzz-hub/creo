"""Webhook receivers for payment gateways (Razorpay and Stripe).

Mounted with raw body extraction and constant-time HMAC verification.
Guarantees idempotent processing via ON CONFLICT DO NOTHING.
Always returns 200 within 2 seconds.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import get_db
from app.models.enums import PaymentProvider
from app.services import payment_service

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Process incoming Razorpay webhook events with HMAC signature validation."""
    raw_body = await request.body()

    if not x_razorpay_signature or not payment_service.verify_webhook_signature(
        raw_body=raw_body,
        signature=x_razorpay_signature,
        provider=PaymentProvider.RAZORPAY,
    ):
        logger.warning("invalid_razorpay_webhook_signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload: dict[str, Any] = json.loads(raw_body.decode("utf-8"))
    except Exception as err:
        logger.warning("malformed_webhook_payload", error=str(err))
        raise HTTPException(status_code=400, detail="Malformed JSON payload") from err

    event_id = str(payload.get("event_id") or payload.get("id") or "rzp_evt_unknown")
    event_type = str(payload.get("event") or "payment.captured")

    await payment_service.record_and_process_webhook(
        db=db,
        provider=PaymentProvider.RAZORPAY,
        event_id=event_id,
        event_type=event_type,
        payload=payload,
    )
    return {"status": "ok"}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Process incoming Stripe webhook events with HMAC signature validation."""
    raw_body = await request.body()

    if not stripe_signature or not payment_service.verify_webhook_signature(
        raw_body=raw_body,
        signature=stripe_signature,
        provider=PaymentProvider.STRIPE,
    ):
        logger.warning("invalid_stripe_webhook_signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload: dict[str, Any] = json.loads(raw_body.decode("utf-8"))
    except Exception as err:
        logger.warning("malformed_webhook_payload", error=str(err))
        raise HTTPException(status_code=400, detail="Malformed JSON payload") from err

    event_id = str(payload.get("id") or "evt_stripe_unknown")
    event_type = str(payload.get("type") or "payment_intent.succeeded")

    await payment_service.record_and_process_webhook(
        db=db,
        provider=PaymentProvider.STRIPE,
        event_id=event_id,
        event_type=event_type,
        payload=payload,
    )
    return {"status": "ok"}
