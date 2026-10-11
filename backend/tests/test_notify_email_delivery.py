"""Notification worker must not report fake production email delivery."""

import asyncio
import uuid
from typing import Any

from app.config import settings
from app.workers.tasks import notify


class FakeAsyncContext:
    def __init__(self, value: Any) -> None:
        self.value = value

    async def __aenter__(self) -> Any:
        return self.value

    async def __aexit__(self, *_: Any) -> None:
        return None


class FakeResult:
    @staticmethod
    def scalar_one_or_none() -> None:
        return None


class FakeSession:
    notification: Any = None

    async def execute(self, _: Any) -> FakeResult:
        return FakeResult()

    def add(self, notification: Any) -> None:
        self.notification = notification

    async def commit(self) -> None:
        return None


def test_unconfigured_production_email_is_recorded_as_failed(monkeypatch: Any) -> None:
    session = FakeSession()
    monkeypatch.setattr(notify, "async_session_factory", lambda: FakeAsyncContext(session))
    monkeypatch.setattr(
        "app.db.session.tenant_session",
        lambda *_args, **_kwargs: FakeAsyncContext(session),
    )
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", "")

    result = asyncio.run(
        notify.send_notification_async(
            user_id=uuid.uuid4(),
            title="Test notification",
            message="Delivery test",
            channel="email",
            recipient_email="client@example.net",
        )
    )

    assert result["sent_at"] is None
    assert result["failed_reason"] == "Resend is not configured (missing API key or sender)."
    assert session.notification.sent_at is None
