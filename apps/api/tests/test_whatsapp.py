import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock

from services.whatsapp import send_otp_sms

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post", new_callable=AsyncMock)
async def test_send_otp_sms_payload(mock_post, monkeypatch):
    """Test that send_otp_sms sends the correct 6-digit and 10-minute expiry payload."""
    monkeypatch.setattr("core.config.settings.MSG91_AUTH_KEY", "fake-auth-key")
    monkeypatch.setattr("core.config.settings.MSG91_SENDER_ID", "TESTID")

    response_mock = MagicMock(status_code=200)
    response_mock.json.return_value = {"type": "success"}
    mock_post.return_value = response_mock

    await send_otp_sms(
        phone_number="9876543210",
        otp="123456",
        country_code="91"
    )

    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args

    assert args[0] == "https://api.msg91.com/api/v5/otp"
    payload = kwargs["json"]
    headers = kwargs.get("headers", {})

    assert payload["mobile"] == "919876543210"
    assert payload["otp"] == "123456"
    assert payload["otp_length"] == 6
    assert payload["otp_expiry"] == 10
    assert payload["sender_id"] == "TESTID"
    assert "authkey" not in payload
    assert headers["authkey"] == "fake-auth-key"
