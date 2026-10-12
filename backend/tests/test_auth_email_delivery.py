"""Regression tests for registration email delivery failures."""

import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.routers import auth


def test_otp_delivery_failure_is_not_treated_as_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth, "send_otp_email", AsyncMock(return_value=False))

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(auth._deliver_otp_or_raise("client@example.com", "123456"))

    assert exc_info.value.status_code == 503
    assert "could not deliver" in exc_info.value.detail.lower()
