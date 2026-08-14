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


@pytest.mark.asyncio
async def test_supabase_sms_webhook_auth_failure(monkeypatch):
    """Test that the SMS webhook rejects requests with invalid authorization."""
    monkeypatch.setattr("core.config.settings.SUPABASE_SERVICE_ROLE_KEY", "test-secret-key")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/sms",
            json={"phone": "9876543210", "otp": "123456"},
            headers={"Authorization": "Bearer wrong-key"}
        )

    assert response.status_code == 401
    error = response.json()
    assert "Invalid authorization token" in error.get("error", {}).get("message", error.get("detail", ""))


@pytest.mark.asyncio
@patch("routers.webhooks.send_otp_sms")
async def test_msg91_forwarder_success(mock_send_otp, monkeypatch):
    """Test that the SMS webhook successfully forwards the OTP."""
    monkeypatch.setattr("core.config.settings.SUPABASE_SERVICE_ROLE_KEY", "test-secret-key")
    mock_send_otp.return_value = {"type": "success"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/sms",
            json={"phone": "+919876543210", "otp": "654321"},
            headers={"Authorization": "Bearer test-secret-key"}
        )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_send_otp.assert_called_once_with(
        phone_number="919876543210",
        otp="654321",
        country_code=""
    )


@pytest.mark.asyncio
@patch("routers.webhooks.send_otp_sms")
async def test_msg91_forwarder_failure(mock_send_otp, monkeypatch):
    """Test that the SMS webhook handles MSG91 API failures gracefully."""
    monkeypatch.setattr("core.config.settings.SUPABASE_SERVICE_ROLE_KEY", "test-secret-key")
    mock_send_otp.side_effect = RuntimeError("MSG91 API returned status 500")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/webhooks/sms",
            json={"phone": "9876543210", "otp": "123456"},
            headers={"Authorization": "Bearer test-secret-key"}
        )

    assert response.status_code == 502
    error = response.json()
    assert "Failed to send SMS via provider" in error.get("error", {}).get("message", error.get("detail", ""))
