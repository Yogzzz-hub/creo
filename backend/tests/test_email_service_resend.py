"""Resend delivery contract tests without sending real email."""

import asyncio
from typing import Any

import pytest

from app.config import settings
from app.services import email_service


class FakeResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        self.text = "Resend rejected the request"

    def json(self) -> dict[str, str]:
        return {"id": "test-email-id"}


class FakeAsyncClient:
    response_status = 200
    request: dict[str, Any] | None = None

    def __init__(self, **_: Any) -> None:
        pass

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        return None

    async def post(
        self, url: str, *, headers: dict[str, str], json: dict[str, Any]
    ) -> FakeResponse:
        type(self).request = {"url": url, "headers": headers, "json": json}
        return FakeResponse(type(self).response_status)


def test_send_email_uses_resend_api_and_configured_sender(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", "Creo <verify@example.com>")
    monkeypatch.setattr(FakeAsyncClient, "response_status", 200)
    monkeypatch.setattr(FakeAsyncClient, "request", None)
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)

    delivered = asyncio.run(
        email_service.send_email("client@example.net", "Verify", "<p>Code</p>", "Code")
    )

    assert delivered is True
    assert FakeAsyncClient.request == {
        "url": "https://api.resend.com/emails",
        "headers": {
            "Authorization": "Bearer re_test_key",
            "Content-Type": "application/json",
        },
        "json": {
            "from": "Creo <verify@example.com>",
            "to": ["client@example.net"],
            "subject": "Verify",
            "html": "<p>Code</p>",
            "text": "Code",
        },
    }


def test_send_email_reports_resend_rejection_as_failure(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", "Creo <verify@example.com>")
    monkeypatch.setattr(FakeAsyncClient, "response_status", 403)
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)

    delivered = asyncio.run(email_service.send_email("client@example.net", "Verify", "Code"))

    assert delivered is False


def test_send_email_fails_closed_when_resend_is_unconfigured(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", "")

    delivered = asyncio.run(email_service.send_email("client@example.net", "Verify", "Code"))

    assert delivered is False


@pytest.mark.parametrize("sender", ["", "   "])
@pytest.mark.parametrize("response_status", [200, 403])
def test_default_sender_handles_resend_acceptance_and_rejection(
    monkeypatch: Any, sender: str, response_status: int
) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", sender)
    monkeypatch.setattr(FakeAsyncClient, "response_status", response_status)
    monkeypatch.setattr(FakeAsyncClient, "request", None)
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)

    delivered = asyncio.run(email_service.send_email("owner@example.net", "Verify", "Code"))

    assert delivered is (response_status == 200)
    assert FakeAsyncClient.request is not None
    assert FakeAsyncClient.request["json"]["from"] == "Creo <onboarding@resend.dev>"
