"""Create genuine gateway orders; never manufacture checkout identifiers."""

import uuid
from typing import Any

import httpx

from app.core.errors import AppError


async def create_razorpay_order(key_id: str, key_secret: str, amount_minor: int, currency: str) -> str:
    if not key_id or not key_secret:
        raise AppError("Checkout is temporarily unavailable. Please contact support.",
                       code="PAYMENT_GATEWAY_UNAVAILABLE", status_code=503)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/orders", auth=(key_id, key_secret),
                json={"amount": amount_minor, "currency": currency,
                      "receipt": f"rcpt_{uuid.uuid4().hex[:10]}"},
            )
            response.raise_for_status()
            data: Any = response.json()
            order_id = data.get("id") if isinstance(data, dict) else None
            if (not isinstance(order_id, str) or not order_id.startswith("order_")
                    or data.get("amount") != amount_minor or data.get("currency") != currency):
                raise ValueError("Invalid gateway order")
            return order_id
    except (httpx.HTTPError, ValueError, TypeError):
        raise AppError("We could not start checkout. Please try again shortly.",
                       code="PAYMENT_GATEWAY_UNAVAILABLE", status_code=503) from None
