import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# Task 10.3: Initialize Rate Limiter (memory storage for dev; swap to Redis for prod)
limiter = Limiter(key_func=get_remote_address)

_ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}


def _cors_headers(request: Request) -> dict[str, str]:
    """
    Return CORS headers mirroring what CORSMiddleware would add.
    Exception handlers short-circuit the middleware stack, so we must
    inject these headers manually to prevent browsers from blocking the
    error response.
    """
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in _ALLOWED_ORIGINS else "http://localhost:3000"
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Vary": "Origin",
    }


# Task 10.2 + 10.3: Global Exception Handlers & Rate Limiter Wiring
def setup_global_middleware_and_exceptions(app: FastAPI) -> None:
    # 1. Register the SlowAPI rate limit handler (with CORS headers)
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "data": None,
                "error": {
                    "code": 429,
                    "message": "Too many requests. Please slow down.",
                },
                "meta": None,
            },
            headers=_cors_headers(request),
        )

    # 2. Handle Starlette/FastAPI HTTPException (4xx) — standardized envelope
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        if isinstance(exc.detail, dict):
            error_body = exc.detail
        else:
            error_body = {
                "code": exc.status_code,
                "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            }
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "data": None,
                "error": error_body,
                "meta": None,
            },
            headers=_cors_headers(request),
        )

    # 3. Handle validation errors (422) — standardized envelope
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "data": None,
                "error": {
                    "code": 422,
                    "message": "Invalid request payload",
                    "details": exc.errors(),
                },
                "meta": None,
            },
            headers=_cors_headers(request),
        )

    # 4. Global catch-all for unhandled server errors (500)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"UNHANDLED ERROR on {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "data": None,
                "error": {
                    "code": 500,
                    "message": "Something went wrong on our end. We've been notified.",
                },
                "meta": None,
            },
            headers=_cors_headers(request),
        )