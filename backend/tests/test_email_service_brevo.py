"""Brevo delivery contracts without sending real email."""

import asyncio
from typing import Any

import httpx
import pytest

from app.config import settings
from app.services import email_service


class FakeAsyncClient:
    response_status = 201
    response_data: dict[str, Any] = {"messageId": "test-message-id"}
    request: dict[str, Any] | None = None

    def __init__(self, **_: Any) -> None:
        pass

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        return None

    async def post(
        self, url: str, *, headers: dict[str, str], json: dict[str, Any]
    ) -> httpx.Response:
        type(self).request = {"url": url, "headers": headers, "json": json}
        return httpx.Response(type(self).response_status, json=type(self).response_data)


@pytest.fixture(autouse=True)
def configured_brevo(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(settings, "SMTP_USERNAME", "")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "test-brevo-key")
    monkeypatch.setattr(settings, "BREVO_FROM_EMAIL", "verify@example.com")
    monkeypatch.setattr(settings, "BREVO_FROM_NAME", "Creo")
    monkeypatch.setattr(FakeAsyncClient, "response_status", 201)
    monkeypatch.setattr(FakeAsyncClient, "response_data", {"messageId": "test-message-id"})
    monkeypatch.setattr(FakeAsyncClient, "request", None)
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)


def test_send_email_uses_brevo_api_and_verified_sender() -> None:
    delivered = asyncio.run(
        email_service.send_email(" client@example.net ", "Verify", "<p>Code</p>", "Code")
    )
    assert delivered is True
    assert FakeAsyncClient.request == {
        "url": "https://api.brevo.com/v3/smtp/email",
        "headers": {
            "api-key": "test-brevo-key",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        "json": {
            "sender": {"name": "Creo", "email": "verify@example.com"},
            "to": [{"email": "client@example.net"}],
            "subject": "Verify",
            "htmlContent": "<p>Code</p>",
            "textContent": "Code",
        },
    }


def test_display_name_sender_is_normalized(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "BREVO_FROM_EMAIL", "Creo Verification <verify@example.com>")
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "Code"))
    assert FakeAsyncClient.request is not None
    assert FakeAsyncClient.request["json"]["sender"] == {
        "name": "Creo Verification", "email": "verify@example.com"
    }


@pytest.mark.parametrize("response_status", [301, 400, 401, 403, 429, 500])
def test_provider_rejection_is_not_reported_as_delivery(
    monkeypatch: Any, response_status: int
) -> None:
    monkeypatch.setattr(FakeAsyncClient, "response_status", response_status)
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "Code")) is False


@pytest.mark.parametrize("field", ["BREVO_API_KEY", "BREVO_FROM_EMAIL"])
@pytest.mark.parametrize("value", ["", "   "])
def test_missing_credentials_fail_without_network(
    monkeypatch: Any, field: str, value: str
) -> None:
    monkeypatch.setattr(settings, field, value)
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "Code")) is False
    assert FakeAsyncClient.request is None


def test_missing_recipient_does_not_send_to_placeholder() -> None:
    assert asyncio.run(email_service.send_email("  ", "Verify", "Code")) is False
    assert FakeAsyncClient.request is None


def test_success_without_message_id_is_not_reported_as_delivery(monkeypatch: Any) -> None:
    monkeypatch.setattr(FakeAsyncClient, "response_data", {})
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "Code")) is False


def test_network_timeout_is_reported_as_failure(monkeypatch: Any) -> None:
    async def timed_out(*_args: Any, **_kwargs: Any) -> None:
        raise httpx.ReadTimeout("Provider timed out")

    monkeypatch.setattr(FakeAsyncClient, "post", timed_out)
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "Code")) is False


def test_otp_template_uses_brevo_delivery() -> None:
    assert asyncio.run(email_service.send_otp_email("client@example.net", "123456"))
    assert FakeAsyncClient.request is not None
    payload = FakeAsyncClient.request["json"]
    assert payload["subject"] == "123456 is your Creo verification code"
    assert "123456" in payload["textContent"]
    assert payload["to"] == [{"email": "client@example.net"}]


def test_smtp_relay_used_when_xsmtpsib_key(monkeypatch: Any) -> None:
    sent_args: dict[str, Any] = {}

    async def fake_smtp(*args: Any, **kwargs: Any) -> bool:
        sent_args["args"] = args
        sent_args["kwargs"] = kwargs
        return True

    monkeypatch.setattr(email_service, "_send_via_smtp", fake_smtp)
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xsmtpsib-test-smtp-key")
    assert asyncio.run(email_service.send_email("client@example.net", "Verify", "<p>Code</p>")) is True
    assert "kwargs" in sent_args
    assert sent_args["args"][0] == "client@example.net"

