import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_verify_webhook_success():
    """Test that the webhook verifies successfully with the correct token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "creo_2026",
                "hub.challenge": "12345challenge"
            }
        )
    assert response.status_code == 200
    assert response.text == "12345challenge"


@pytest.mark.asyncio
async def test_verify_webhook_token_mismatch():
    """Test that a verification token mismatch returns a 403 Forbidden."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong_token",
                "hub.challenge": "12345challenge"
            }
        )
    assert response.status_code == 403
    error = response.json()
    message = error.get("error", {}).get("message", error.get("detail", ""))
    assert "Verification token mismatch" in message


@pytest.mark.asyncio
async def test_verify_webhook_invalid_request():
    """Test that missing query parameters return a 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/webhook")
    assert response.status_code == 400
    error = response.json()
    message = error.get("error", {}).get("message", error.get("detail", ""))
    assert "Invalid request" in message
