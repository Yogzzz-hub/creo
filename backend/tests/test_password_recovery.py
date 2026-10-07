import time
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.core.rbac import Actor
from app.core.security import decode_token, verify_password
from app.models.enums import AccountStatus, UserRole
from app.routers import auth


def account_db():
    user = SimpleNamespace(id=uuid.uuid4(), email="google-user@example.com", full_name="Account owner",
                           role=UserRole.CLIENT, account_status=AccountStatus.ACTIVE, agency_id=None,
                           hashed_password=None, must_reset_password=False)
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: user)),
                         commit=AsyncMock(), refresh=AsyncMock())
    return user, db


@pytest.mark.asyncio
async def test_google_account_recovery_preserves_identity_and_onboarding(monkeypatch):
    user, db = account_db()
    monkeypatch.setattr(auth, "_load_otp", AsyncMock(return_value=["123456", time.time() + 600, 0]))
    monkeypatch.setattr(auth, "_save_otp", AsyncMock())
    delete = AsyncMock()
    monkeypatch.setattr(auth, "_delete_otp", delete)
    monkeypatch.setattr("app.services.onboarding_service.get_current_stage", AsyncMock(return_value=8))
    result = await auth.verify_reset_otp(auth.VerifyResetOtpRequest(email=user.email, code="123456"), db=db)
    assert result["user"]["id"] == str(user.id)
    assert result["user"]["onboarding_stage"] == 8
    assert decode_token(result["access_token"])["must_reset_password"] is True
    assert user.hashed_password is None
    delete.assert_awaited_once_with(f"reset:{user.email}")


@pytest.mark.asyncio
async def test_setting_password_replaces_restricted_token_and_keeps_account(monkeypatch):
    user, db = account_db()
    user.must_reset_password = True
    monkeypatch.setattr("app.services.onboarding_service.get_current_stage", AsyncMock(return_value=8))
    result = await auth.set_mandatory_password(auth.SetMandatoryPasswordRequest(new_password="A-new-password-789"),
                                             actor=Actor(user_id=user.id, role=user.role), db=db)
    assert verify_password("A-new-password-789", user.hashed_password)
    assert user.must_reset_password is False
    token = decode_token(result["access_token"])
    assert token["sub"] == str(user.id)
    assert token["must_reset_password"] is False
    assert result["user"]["onboarding_stage"] == 8
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("stored,code,status", [
    (None, "123456", 400),
    (["123456", 0, 0], "123456", 400),
    (["123456", time.time() + 600, 0], "000000", 400),
    (["123456", time.time() + 600, 5], "123456", 429),
])
async def test_invalid_recovery_cannot_authenticate(monkeypatch, stored, code, status):
    _, db = account_db()
    monkeypatch.setattr(auth, "_load_otp", AsyncMock(return_value=stored))
    monkeypatch.setattr(auth, "_save_otp", AsyncMock())
    monkeypatch.setattr(auth, "_delete_otp", AsyncMock())
    with pytest.raises(HTTPException) as error:
        await auth.verify_reset_otp(auth.VerifyResetOtpRequest(email="google-user@example.com", code=code), db=db)
    assert error.value.status_code == status
    db.commit.assert_not_awaited()
