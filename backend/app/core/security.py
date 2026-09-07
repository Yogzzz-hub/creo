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
) -> str:
    """Generate cryptographically signed JWT access token."""
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
    }
    if email:
        payload["email"] = email
    if client_id:
        payload["client_id"] = str(client_id)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str | uuid.UUID,
    expires_delta: timedelta | None = None,
) -> str:
    """Generate long-lived JWT refresh token."""
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
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate JWT token signature and expiry."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as err:
        raise Unauthorized("Token has expired", code="TOKEN_EXPIRED") from err
    except jwt.InvalidTokenError as err:
        raise Unauthorized("Invalid authentication token", code="INVALID_TOKEN") from err


def hash_password(password: str) -> str:
    """Hash password securely using bcrypt with salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False
