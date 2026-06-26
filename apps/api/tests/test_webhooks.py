import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch

from main import app


@pytest.mark.asyncio
async def test_stripe_webhook_missing_signature():
    """Test that Stripe webhook rejects requests without the signature header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/stripe",
            json={"type": "invoice.payment_succeeded"}
        )

    assert response.status_code == 400
    error = response.json()
    assert "Missing Stripe-Signature header" in error.get("error", {}).get("message", error.get("detail", ""))


@pytest.mark.asyncio
@patch("routers.webhooks.verify_stripe_signature")
async def test_stripe_webhook_invalid_signature(mock_verify):
    """Test that Stripe webhook rejects requests with an invalid signature."""
    mock_verify.side_effect = Exception("Signature mismatch")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/stripe",
            json={"type": "invoice.payment_succeeded"},
            headers={"Stripe-Signature": "t=forged_signature,v1=forged"}
        )

    assert response.status_code == 400
    error = response.json()
    assert "Invalid signature" in error.get("error", {}).get("message", error.get("detail", ""))


@pytest.mark.asyncio
@patch("routers.webhooks.verify_razorpay_signature")
async def test_razorpay_webhook_invalid_signature(mock_verify):
    """Test that Razorpay webhook rejects requests with an invalid signature."""
    mock_verify.side_effect = Exception("Signature mismatch")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/razorpay",
            json={"event": "payment.captured", "payload": {}},
            headers={"X-Razorpay-Signature": "forged_signature"}
        )

    assert response.status_code == 400
    error = response.json()
    assert "Invalid signature" in error.get("error", {}).get("message", error.get("detail", ""))


@pytest.mark.asyncio
async def test_razorpay_webhook_malformed_json():
    """Test that Razorpay webhook handles completely broken payloads gracefully."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/razorpay",
            content="This is not JSON",
            headers={"X-Razorpay-Signature": "some_sig"}
        )

    assert response.status_code == 400
