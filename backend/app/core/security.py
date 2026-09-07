"""Security utilities: JWT creation, verification, and password hashing."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.config import settings
from app.core.errors import Unauthorized
from app.core.logging import get_logger

logger = get_logger(__name__)

ALGORITHM = "HS256"


def create_access_token(
    subject: str | uuid.UUID,
    role: str,
    email: str | None = None,
    client_id: str | uuid.UUID | None = None,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Generate cryptographically signed JWT access token with unique JTI."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES or 60)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": str(role).lower(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
        "jti": uuid.uuid4().hex,
    }
    if email:
        payload["email"] = email
    if client_id:
        payload["client_id"] = str(client_id)
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str | uuid.UUID,
    expires_delta: timedelta | None = None,
) -> str:
    """Generate long-lived JWT refresh token with unique JTI."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_DAYS or 30)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str | None = "access") -> dict[str, Any]:
    """Decode and validate JWT token signature, expiry, and token type."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        if expected_type and payload.get("type") != expected_type:
            raise Unauthorized(f"Invalid token type. Expected '{expected_type}' token.", code="INVALID_TOKEN_TYPE")
        return payload
    except jwt.ExpiredSignatureError as err:
        raise Unauthorized("Token has expired. Please sign in again.", code="TOKEN_EXPIRED") from err
    except jwt.InvalidTokenError as err:
        raise Unauthorized("Invalid authentication token.", code="INVALID_TOKEN") from err


def hash_password(password: str) -> str:
    """Hash password securely using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength according to OWASP guidelines:
    - Minimum 8 characters, maximum 128 characters
    - Must contain at least one letter and at least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, ""
