from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import httpx
import pytest

from app.core.errors import AppError
from app.models.enums import PaymentProvider
from app.services.razorpay_orders import create_razorpay_order
from app.services.payment_service import create_order


@pytest.mark.asyncio
@pytest.mark.parametrize('payload', [None, {}, {'id': 'fake'},
    {'id': 'order_valid', 'amount': 1, 'currency': 'INR'}])
async def test_rejected_or_malformed_gateway_order_is_not_checkout_success(payload):
    client = AsyncMock()
    client.post.return_value = httpx.Response(200, json=payload,
        request=httpx.Request('POST', 'https://api.razorpay.com/v1/orders'))
    with patch('app.services.razorpay_orders.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = client
        with pytest.raises(AppError) as error:
            await create_razorpay_order('rzp_test_key', 'secret', 250000, 'INR')
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_gateway_failure_does_not_create_pending_subscription():
    plan = SimpleNamespace(id=uuid.uuid4(), price_minor=250000, currency='INR')
    results = [SimpleNamespace(scalar_one_or_none=lambda: value)
               for value in [plan, SimpleNamespace(id=uuid.uuid4()), None, None]]
    db = SimpleNamespace(execute=AsyncMock(side_effect=results), add=MagicMock(), commit=AsyncMock())
    with patch('app.services.subscription_guard.expire_stale_subscriptions', new=AsyncMock()), \
         patch('app.services.razorpay_orders.create_razorpay_order', new=AsyncMock(
             side_effect=AppError('Unavailable', status_code=503))):
        with pytest.raises(AppError):
            await create_order(db, uuid.uuid4(), plan.id, PaymentProvider.RAZORPAY)
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_genuine_gateway_order_and_missing_credentials():
    client = AsyncMock()
    client.post.return_value = httpx.Response(200,
        json={'id': 'order_valid', 'amount': 250000, 'currency': 'INR'},
        request=httpx.Request('POST', 'https://api.razorpay.com/v1/orders'))
    with patch('app.services.razorpay_orders.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = client
        assert await create_razorpay_order('rzp_test_key', 'secret', 250000, 'INR') == 'order_valid'
        with pytest.raises(AppError):
            await create_razorpay_order('', '', 250000, 'INR')
    assert client.post.await_count == 1
