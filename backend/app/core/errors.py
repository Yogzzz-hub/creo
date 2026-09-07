"""Application exception hierarchy and FastAPI error handler.

Enforces standardized JSON error responses:
{"error": {"code": "...", "message": "...", "details": {...}}}
"""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application exception with error code and details."""

    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        details: dict[str, Any] | None = None,
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
        self.status_code = status_code


class NotFound(AppError):
    """Resource was not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        code: str = "NOT_FOUND",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=404)


class Conflict(AppError):
    """Operation resulted in a conflict or invalid state transition."""

    def __init__(
        self,
        message: str = "Conflict with current state",
        code: str = "CONFLICT",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=409)


class Forbidden(AppError):
    """Actor lacks sufficient permissions for the requested action."""

    def __init__(
        self,
        message: str = "Action forbidden",
        code: str = "FORBIDDEN",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=403)


class QuotaExceeded(AppError):
    """Client quota has been exhausted."""

    def __init__(
        self,
        message: str = "Quota limit reached",
        code: str = "QUOTA_EXCEEDED",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=402)


class PaymentRequired(AppError):
    """Payment required before proceeding."""

    def __init__(
        self,
        message: str = "Payment required to access this resource",
        code: str = "PAYMENT_REQUIRED",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=402)


class Unauthorized(AppError):
    """Authentication required or session invalid/suspended."""

    def __init__(
        self,
        message: str = "Authentication required",
        code: str = "UNAUTHORIZED",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code=code, details=details, status_code=401)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Render AppError exceptions into the canonical error envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )
