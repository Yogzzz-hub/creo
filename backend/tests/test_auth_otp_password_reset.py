import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app


@pytest.mark.asyncio
async def test_full_auth_otp_and_password_reset_flow(db_session: AsyncSession):
    uid = uuid.uuid4().hex[:8]
    test_email = f"tester_{uid}@example.com"
    initial_password = "SecretPassword123!"
    new_password = "UpdatedPassword456!"

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        # 1. Register Intent
        reg_intent_resp = await ac.post(
            "/api/v1/auth/register-intent",
            json={
                "email": test_email,
                "password": initial_password,
                "full_name": "OTP Test User",
            },
        )
        assert reg_intent_resp.status_code == 200
        data = reg_intent_resp.json()
        assert data["status"] == "sent"
        assert data["email"] == test_email

        # Duplicate register-intent with existing email check after completion (will test later)

        # 2. Verify Registration with code 123456 (dev/test allowed)
        verify_reg_resp = await ac.post(
            "/api/v1/auth/verify-registration",
            json={
                "email": test_email,
                "code": "123456",
                "password": initial_password,
                "full_name": "OTP Test User",
            },
        )
        assert verify_reg_resp.status_code == 200
        user_data = verify_reg_resp.json()
        assert user_data["user"]["email"] == test_email
        assert user_data["user"]["must_reset_password"] is False
        assert "access_token" in user_data

        # 3. Login with that exact email and password
        login_resp = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": initial_password,
            },
        )
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert login_data["user"]["must_reset_password"] is False
        access_token = login_data["access_token"]

        # Check /me endpoint
        me_resp = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["must_reset_password"] is False

        # 4. Forgot Password request
        forgot_resp = await ac.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_email},
        )
        assert forgot_resp.status_code == 200
        assert forgot_resp.json()["status"] == "sent"

        # 5. Verify Reset OTP
        reset_verify_resp = await ac.post(
            "/api/v1/auth/verify-reset-otp",
            json={
                "email": test_email,
                "code": "123456",
            },
        )
        assert reset_verify_resp.status_code == 200
        reset_data = reset_verify_resp.json()
        assert reset_data["user"]["must_reset_password"] is True
        reset_token = reset_data["access_token"]

        # 6. Verify that /me returns must_reset_password: True across reload
        me_reset_resp = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {reset_token}"},
        )
        assert me_reset_resp.status_code == 200
        assert me_reset_resp.json()["must_reset_password"] is True

        # 7. Set Mandatory New Password
        set_pw_resp = await ac.post(
            "/api/v1/auth/set-mandatory-password",
            headers={"Authorization": f"Bearer {reset_token}"},
            json={"new_password": new_password},
        )
        assert set_pw_resp.status_code == 200
        assert set_pw_resp.json()["status"] == "success"
        assert set_pw_resp.json()["user"]["must_reset_password"] is False

        # 8. Check /me again - must_reset_password is now False
        me_unlocked_resp = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {reset_token}"},
        )
        assert me_unlocked_resp.status_code == 200
        assert me_unlocked_resp.json()["must_reset_password"] is False

        # 9. Verify login with old password fails
        bad_login_resp = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": initial_password,
            },
        )
        assert bad_login_resp.status_code == 401

        # 10. Verify login with NEW password succeeds
        new_login_resp = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": new_password,
            },
        )
        assert new_login_resp.status_code == 200
        assert new_login_resp.json()["user"]["email"] == test_email
        assert new_login_resp.json()["user"]["must_reset_password"] is False
