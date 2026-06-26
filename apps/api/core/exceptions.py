import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# Task 10.3: Initialize Rate Limiter (memory storage for dev; swap to Redis for prod)
limiter = Limiter(key_func=get_remote_address)


# Task 10.2 + 10.3: Global Exception Handlers & Rate Limiter Wiring
def setup_global_middleware_and_exceptions(app: FastAPI) -> None:
    # 1. Register the SlowAPI rate limit handler
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        )

    # 3. Handle validation errors (422) — standardized envelope
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "data": None,
                "error": {
                    "code": 422,
                    "message": "Invalid request payload",
                    "details": exc.errors(),
                },
                "meta": None,
            },
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
        )