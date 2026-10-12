"""Add-on checkout requires a server-verified active subscription."""

import asyncio
import uuid

import pytest
from fastapi import HTTPException

from app.core.rbac import Actor
from app.models.enums import UserRole
from app.routers import payments


def test_addon_order_is_rejected_without_active_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gateway_called = False

    async def inactive_subscription(_db: object, _client_id: uuid.UUID) -> dict[str, object]:
        return {"is_active": False, "is_expired": False, "status": "incomplete"}

    async def create_order(*_args: object) -> str:
        nonlocal gateway_called
        gateway_called = True
        return "order_should_not_be_created"

    monkeypatch.setattr(
        "app.services.subscription_guard.check_client_subscription", inactive_subscription
    )
    monkeypatch.setattr("app.services.razorpay_orders.create_razorpay_order", create_order)
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.CLIENT)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            payments.create_addon_order(
                {"addon_id": "rush"}, actor=actor, db=object()  # type: ignore[arg-type]
            )
        )

    assert error.value.status_code == 402
    assert error.value.detail["code"] == "PAYMENT_REQUIRED"
    assert gateway_called is False


def test_addon_order_is_created_for_active_subscription(monkeypatch: pytest.MonkeyPatch) -> None:
    async def active_subscription(_db: object, _client_id: uuid.UUID) -> dict[str, object]:
        return {"is_active": True, "is_expired": False, "status": "active"}

    async def create_order(
        _key_id: str, _key_secret: str, amount_minor: int, currency: str
    ) -> str:
        assert amount_minor == 600_000
        assert currency == "INR"
        return "order_active_subscription"

    monkeypatch.setattr(
        "app.services.subscription_guard.check_client_subscription", active_subscription
    )
    monkeypatch.setattr("app.services.razorpay_orders.create_razorpay_order", create_order)
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.CLIENT)

    result = asyncio.run(
        payments.create_addon_order(
            {"addon_id": "rush"}, actor=actor, db=object()  # type: ignore[arg-type]
        )
    )

    assert result["order_id"] == "order_active_subscription"
    assert result["addon_id"] == "rush"
    assert result["amount_minor"] == 600_000
