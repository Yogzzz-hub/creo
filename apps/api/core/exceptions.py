import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

# Task 10.3: Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Task 10.2: Global Exception Handlers
def setup_global_middleware_and_exceptions(app: FastAPI) -> None:
    # 1. Register the SlowAPI rate limit handler
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 2. Handle standard validation errors (422) to match TRD envelope
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "data": None,
                "error": {
                    "message": "Invalid request payload",
                    "details": exc.errors()
                },
                "meta": None
            }
        )

    # 3. The Ultimate Global Catch-All for Server Errors (500)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Log the full stack trace securely on the server
        logger.exception(f"CRITICAL ERROR on {request.method} {request.url.path}: {exc}")
        
        # Return a safe, generic message to the client
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "data": None,
                "error": {
                    "message": "Something went wrong on our end. We've been notified.",
                    "code": "INTERNAL_SERVER_ERROR"
                },
                "meta": None
            }
        )