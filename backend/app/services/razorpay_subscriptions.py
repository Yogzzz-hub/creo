"""Recurring mandate checkout and provider-confirmed billing state."""
from datetime import UTC, datetime
import re
from typing import Any
import httpx
from app.config import settings
from app.core.errors import AppError, Conflict
from app.core.logging import get_logger

logger = get_logger(__name__)


def rejected_response(status: int, data: dict, operation: str) -> AppError:
    error = data.get("error") if isinstance(data.get("error"), dict) else {}
    description = str(error.get("description") or "").lower()
    field = error.get("field")
    if field not in {"total_count", "customer_notify", "plan_id", "amount", "item.amount", "quantity", "period", "interval", "start_at", "notes", "currency"}:
        field = None
    code = "RAZORPAY_REQUEST_REJECTED"
    message = "Razorpay rejected recurring checkout. Please contact your agency to check the billing setup."
    if status == 401 or "authentication failed" in description:
        code = "RAZORPAY_CREDENTIALS_INVALID"
        message = "Razorpay rejected the agency’s payment credentials. Please ask your agency to correct its billing setup."
    elif status == 403 or ("subscription" in description and any(word in description for word in ("not enabled", "not activated", "enable", "not allowed", "not available"))):
        code = "RAZORPAY_SUBSCRIPTIONS_DISABLED"
        message = "Recurring payments are not enabled for this Razorpay account. Your agency must enable Razorpay Subscriptions before checkout."
    elif status == 429 or status >= 500:
        code = "RAZORPAY_TEMPORARILY_UNAVAILABLE"
        message = "Razorpay is temporarily unavailable. Please retry shortly."
    # Safe, bounded diagnostics only. Never log provider descriptions, request
    # payloads, URLs containing IDs, authorization headers, API keys or secrets.
    provider_code = error.get("code")
    if provider_code not in {"BAD_REQUEST_ERROR", "GATEWAY_ERROR", "SERVER_ERROR", "AUTHENTICATION_ERROR"}:
        provider_code = "UNKNOWN"
    logger.warning("razorpay_subscription_rejected", operation=operation, http_status=status,
        provider_code=provider_code, field=field, classification=code)
    return AppError(message, code=code, status_code=503 if status in (401, 403, 429) or status >= 500 else 409,
        details={"operation": operation, "provider_http_status": status, "field": field})


def identifier(value: str, prefix: str) -> str:
    if not re.fullmatch(prefix + r"_[A-Za-z0-9]+", value):
        raise Conflict("Invalid Razorpay identifier.")
    return value


async def call(method: str, path: str, payload: dict | None = None) -> dict[str, Any]:
    operation = "create_plan" if method == "POST" and path == "plans" else "create_subscription" if method == "POST" and path == "subscriptions" else "pause_subscription" if path.endswith("/pause") else "resume_subscription" if path.endswith("/resume") else "fetch_subscription" if path.startswith("subscriptions/") else "fetch_plan"
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise AppError("Razorpay recurring billing is unavailable. Contact your agency.", code="PAYMENT_GATEWAY_UNAVAILABLE", status_code=503)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(method, "https://api.razorpay.com/v1/" + path,
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), json=payload)
            try:
                data = response.json()
            except ValueError:
                if not response.is_error:
                    raise
                data = {}
            if response.is_error or isinstance(data, dict) and "error" in data:
                raise rejected_response(response.status_code, data if isinstance(data, dict) else {}, operation)
            if not isinstance(data, dict):
                raise ValueError()
            return data
    except httpx.HTTPError:
        logger.warning("razorpay_subscription_network_error", operation=operation)
        raise AppError("Could not reach Razorpay. Please retry shortly; no payment has been confirmed.", code="RAZORPAY_NETWORK_ERROR", status_code=503) from None
    except (ValueError, TypeError):
        logger.warning("razorpay_subscription_invalid_response", operation=operation)
        raise AppError("Razorpay returned an invalid billing response. Please retry shortly.", code="RAZORPAY_INVALID_RESPONSE", status_code=503) from None


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
