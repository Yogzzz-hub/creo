"""Recurring mandate checkout and provider-confirmed billing state."""
from datetime import UTC, datetime
import re
from typing import Any
import httpx
from app.config import settings
from app.core.errors import AppError, Conflict


def identifier(value: str, prefix: str) -> str:
    if not re.fullmatch(prefix + r"_[A-Za-z0-9]+", value):
        raise Conflict("Invalid Razorpay identifier.")
    return value


async def call(method: str, path: str, payload: dict | None = None) -> dict[str, Any]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise AppError("Razorpay recurring billing is unavailable. Contact your agency.", code="PAYMENT_GATEWAY_UNAVAILABLE", status_code=503)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(method, "https://api.razorpay.com/v1/" + path,
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), json=payload)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError()
            return data
    except (httpx.HTTPError, ValueError):
        raise AppError("Razorpay did not confirm this billing change. Retry to check its status; billing has not been marked changed in CREO.", code="RAZORPAY_UNCONFIRMED", status_code=503) from None


async def create(plan, client_id) -> str:
    remote_plan = await call("POST", "plans", {"period": "monthly", "interval": 1,
        "item": {"name": plan.display_name, "amount": plan.price_minor, "currency": plan.currency}})
    plan_id = identifier(str(remote_plan.get("id", "")), "plan")
    subscription = await call("POST", "subscriptions", {"plan_id": plan_id, "total_count": 120,
        "customer_notify": True, "quantity": 1, "notes": {"creo_client_id": str(client_id)}})
    return identifier(str(subscription.get("id", "")), "sub")


async def fetch(subscription_id: str) -> dict:
    data = await call("GET", "subscriptions/" + identifier(subscription_id, "sub"))
    if data.get("id") != subscription_id:
        raise Conflict("Razorpay returned another subscription.")
    return data


def paid_period(remote: dict, expected_id: str) -> tuple[datetime, datetime]:
    if remote.get("id") != expected_id or remote.get("status") not in ("active", "paused", "halted", "cancelled", "completed") or not remote.get("paid_count"):
        raise Conflict("AutoPay authorization is not a paid subscription. Complete the first monthly payment.", code="PAYMENT_NOT_CAPTURED")
    try:
        start, end = datetime.fromtimestamp(int(remote["current_start"]), UTC), datetime.fromtimestamp(int(remote["current_end"]), UTC)
    except (KeyError, ValueError, TypeError, OverflowError):
        raise Conflict("Razorpay did not return a confirmed paid billing period.") from None
    if end <= start:
        raise Conflict("Razorpay returned an invalid billing period.")
    return start, end


async def change(subscription_id: str, operation: str) -> dict:
    remote = await fetch(subscription_id)
    desired = "paused" if operation == "pause" else "active"
    if remote.get("status") == desired:
        return remote
    if operation == "pause" and remote.get("status") != "active":
        raise Conflict("Only an active Razorpay subscription can be paused.")
    if operation == "resume" and remote.get("status") != "paused":
        raise Conflict("Only a paused Razorpay subscription can be resumed.")
    await call("POST", f"subscriptions/{identifier(subscription_id, 'sub')}/{operation}", {"pause_at" if operation == "pause" else "resume_at": "now"})
    confirmed = await fetch(subscription_id)
    if confirmed.get("status") != desired:
        raise Conflict("Razorpay has not confirmed the requested billing state yet. Retry to reconcile.")
    return confirmed
