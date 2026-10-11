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

# bcrypt only reads the first 72 bytes of a password. bcrypt<5 truncated silently,
# bcrypt>=5 raises instead, so truncate explicitly to keep every existing hash valid.
BCRYPT_MAX_BYTES = 72


def create_access_token(
    subject: str | uuid.UUID,
    role: str,
    email: str | None = None,
    client_id: str | uuid.UUID | None = None,
    agency_id: str | uuid.UUID | None = None,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
    token_version: int | None = None,
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
    if agency_id:
        payload["agency_id"] = str(agency_id)
    if token_version is not None:
        payload["tv"] = token_version
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str | uuid.UUID,
    expires_delta: timedelta | None = None,
    token_version: int | None = None,
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
    if token_version is not None:
        payload["tv"] = token_version
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_password_reset_token(
    subject: str | uuid.UUID,
    token_version: int,
    expires_delta: timedelta = timedelta(minutes=15),
) -> str:
    """Short-lived token proving the holder verified a reset code for this account.

    It is not an access token, so it cannot call any other endpoint. Changing the
    password bumps the user's token_version, which makes the token single-use.
    """
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "type": "password_reset",
        "tv": token_version,
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


def normalize_password(password: str) -> str:
    """Drop surrounding whitespace that autofill and mobile keyboards silently add."""
    return password.strip()


def _bcrypt_input(password: str) -> bytes:
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Hash password securely using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(_bcrypt_input(normalize_password(password)), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password.

    The normalized form is checked first; the raw form is a fallback for hashes that
    older reset flows stored with surrounding whitespace.
    """
    candidates = [normalize_password(plain_password)]
    if plain_password != candidates[0]:
        candidates.append(plain_password)
    for candidate in candidates:
        try:
            if bcrypt.checkpw(_bcrypt_input(candidate), hashed_password.encode("utf-8")):
                return True
        except Exception:
            return False
    return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength according to OWASP guidelines:
    - Minimum 8 characters, maximum 128 characters
    - Must contain at least one letter and at least one digit
    """
    password = normalize_password(password)
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, ""
