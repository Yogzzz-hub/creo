import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from app.config import settings
from app.core.errors import AppError
from app.routers.onboarding import get_manual_payment_request
from app.services import razorpay_subscriptions as gateway


@pytest.mark.asyncio
async def test_manual_payment_lookup_is_read_only_and_returns_empty_without_error():
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(fetchone=lambda: None)))
    actor = SimpleNamespace(client_id=None, user_id=uuid.uuid4())
    assert await get_manual_payment_request(actor, db) is None
    db.execute.assert_awaited_once()
    statement, params = db.execute.call_args.args
    assert str(statement).lstrip().startswith("SELECT")
    assert params["cid"] == actor.user_id


@pytest.mark.asyncio
@pytest.mark.parametrize("status,body,expected", [
    (401, {"error": {"code": "BAD_REQUEST_ERROR", "description": "Authentication failed"}}, "RAZORPAY_CREDENTIALS_INVALID"),
    (400, {"error": {"code": "BAD_REQUEST_ERROR", "description": "Subscriptions are not enabled for this merchant"}}, "RAZORPAY_SUBSCRIPTIONS_DISABLED"),
    (400, {"error": {"code": "BAD_REQUEST_ERROR", "description": "The total_count is invalid", "field": "total_count"}}, "RAZORPAY_REQUEST_REJECTED"),
    (503, {}, "RAZORPAY_TEMPORARILY_UNAVAILABLE"),
])
async def test_real_http_provider_rejections_keep_safe_actionable_classification(status, body, expected):
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(status, json=body))
    with patch.object(settings, "RAZORPAY_KEY_ID", "private-key-id"), patch.object(settings, "RAZORPAY_KEY_SECRET", "private-secret"), \
         patch.object(gateway.httpx, "AsyncClient", side_effect=lambda **kwargs: original(transport=transport, **kwargs)), \
         patch.object(gateway.logger, "warning") as log:
        with pytest.raises(AppError) as error:
            await gateway.call("POST", "subscriptions", {"notes": {"private": "do-not-log"}})
        assert error.value.code == expected
        assert log.call_args.kwargs["operation"] == "create_subscription"
        assert "private" not in str(log.call_args)
        assert "description" not in log.call_args.kwargs


@pytest.mark.asyncio
async def test_provider_network_failure_and_invalid_success_response_are_distinct():
    original = httpx.AsyncClient
    for transport, expected in [
        (httpx.MockTransport(lambda request: (_ for _ in ()).throw(httpx.ConnectError("secret network detail"))), "RAZORPAY_NETWORK_ERROR"),
        (httpx.MockTransport(lambda request: httpx.Response(200, text="broken json")), "RAZORPAY_INVALID_RESPONSE"),
    ]:
        with patch.object(settings, "RAZORPAY_KEY_ID", "id"), patch.object(settings, "RAZORPAY_KEY_SECRET", "secret"), \
             patch.object(gateway.httpx, "AsyncClient", side_effect=lambda **kwargs: original(transport=transport, **kwargs)):
            with pytest.raises(AppError) as error:
                await gateway.call("POST", "plans", {})
            assert error.value.code == expected
            assert "secret network detail" not in error.value.message
