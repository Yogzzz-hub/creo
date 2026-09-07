"""Security hardening and anti-hacking test suite."""

import time
import uuid
from datetime import timedelta
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.core.errors import Unauthorized
from app.main import app
from app.models.enums import UserRole


def test_password_strength_validation() -> None:
    """Validate password complexity enforcement."""
    assert validate_password_strength("short")[0] is False
    assert validate_password_strength("12345678")[0] is False  # No letters
    assert validate_password_strength("abcdefgh")[0] is False  # No numbers
    assert validate_password_strength("ValidPass123")[0] is True


def test_jwt_token_creation_and_claims() -> None:
    """Validate cryptographically signed JWT token with JTI and standard claims."""
    user_id = uuid.uuid4()
    token = create_access_token(
        subject=user_id,
        role="admin",
        email="security@creo.agency",
        client_id=user_id,
        extra_claims={"test_claim": "verified"},
    )
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "admin"
    assert payload["email"] == "security@creo.agency"
    assert payload["type"] == "access"
    assert "jti" in payload
    assert payload["test_claim"] == "verified"


def test_jwt_token_expiration() -> None:
    """Validate expired token rejection."""
    user_id = uuid.uuid4()
    expired_token = create_access_token(
        subject=user_id,
        role="client",
        expires_delta=timedelta(seconds=-10),  # expired 10s ago
    )
    with pytest.raises(Unauthorized) as exc:
        decode_token(expired_token, expected_type="access")
    assert exc.value.code == "TOKEN_EXPIRED"


def test_jwt_token_type_enforcement() -> None:
    """Validate access vs refresh token type enforcement."""
    from app.core.security import create_refresh_token
    user_id = uuid.uuid4()
    refresh_token = create_refresh_token(subject=user_id)
    with pytest.raises(Unauthorized) as exc:
        decode_token(refresh_token, expected_type="access")
    assert exc.value.code == "INVALID_TOKEN_TYPE"


@pytest.mark.asyncio
async def test_jwt_bearer_authentication_on_api() -> None:
    """Verify that protected API endpoint accepts valid JWT and rejects forged/missing tokens."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Without token, returns 401 Unauthorized
        res_no_auth = await client.get("/api/v1/admin/dashboard")
        assert res_no_auth.status_code == 401

        # 2. With forged token, returns 401 Unauthorized
        res_fake = await client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": "Bearer forged.invalid.token"},
        )
        assert res_fake.status_code == 401

        # 3. With valid Admin token, succeeds
        admin_id = uuid.uuid4()
        admin_token = create_access_token(subject=admin_id, role="admin", email="admin@creo.agency")
        res_valid = await client.get(
            "/api/v1/admin/kpis",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_valid.status_code == 200

        # 4. With client token on admin route, returns 403 Forbidden
        client_id = uuid.uuid4()
        client_token = create_access_token(subject=client_id, role="client", email="client@test.com")
        res_forbidden = await client.get(
            "/api/v1/admin/kpis",
            headers={"Authorization": f"Bearer {client_token}"},
        )
        assert res_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_mandatory_password_reset_blocks_protected_api() -> None:
    """User flagged with must_reset_password=True must be blocked from accessing protected resources."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user_id = uuid.uuid4()
        locked_token = create_access_token(
            subject=user_id,
            role="client",
            email="reset-needed@example.com",
            extra_claims={"must_reset_password": True},
        )

        res = await client.get(
            "/api/v1/tasks/kanban",
            headers={"Authorization": f"Bearer {locked_token}"},
        )
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "PASSWORD_RESET_REQUIRED"


@pytest.mark.asyncio
async def test_security_headers_injected() -> None:
    """Verify OWASP security headers on all responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.headers["X-Frame-Options"] == "DENY"
        assert res.headers["X-XSS-Protection"] == "1; mode=block"
        assert "Strict-Transport-Security" in res.headers
        assert "Content-Security-Policy" in res.headers
