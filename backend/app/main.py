"""FastAPI main application entrypoint.

Configures CORS, middleware, exception handlers, and the canonical health check.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as aioredis
import urllib.parse
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, get_db

from app.config import settings
from app.core.errors import AppError, app_error_handler
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIdMiddleware
from app.db.session import engine
from app.routers import (
    admin,
    auth,
    calendar,
    deliverables,
    notifications,
    onboarding,
    payments,
    plans,
    portal_dashboard,
    tasks,
    tickets,
    webhooks,
)

logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown."""
    setup_logging()
    logger.info(
        "server_starting",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
    )
    yield
    logger.info("server_shutting_down")
    await engine.dispose()


app = FastAPI(
    title="Creo API",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Request ID tracking middleware
app.add_middleware(RequestIdMiddleware)

# CORS configuration (explicit origins + preview regex for Vercel, Cloudflare Pages, and Render)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9\-_]+\.)*(vercel\.app|pages\.dev|onrender\.com)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized application error handler
app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]


# In-memory IP-based rate limiting dictionary
_ip_request_timestamps: dict[str, list[float]] = {}
MAX_REQUESTS_PER_WINDOW = 200  # 200 requests per 10-second window per IP
WINDOW_SECONDS = 10
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 Megabytes max request size for video/image uploads


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    """Zero-trust security middleware:
    - Payload size limitation to prevent DOS / memory exhaustion
    - Sliding-window IP request throttling
    - Comprehensive OWASP security headers injection
    """
    import time

    client_ip = request.client.host if request.client else "unknown"

    # 1. Payload size check (exempt upload routes for media files)
    if not request.url.path.endswith("/upload") and not request.url.path.endswith("/upload-intent"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_CONTENT_LENGTH:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": f"Request payload exceeds maximum allowed size of {MAX_CONTENT_LENGTH // (1024*1024)}MB.",
                    }
                },
            )

    # 2. IP-based request throttling / anti-DDoS (exempt health endpoint)
    if not request.url.path.endswith("/health"):
        now = time.time()
        cutoff = now - WINDOW_SECONDS
        timestamps = [t for t in _ip_request_timestamps.get(client_ip, []) if t > cutoff]
        if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
            _ip_request_timestamps[client_ip] = timestamps
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests from your IP address. Please slow down.",
                    }
                },
            )
        timestamps.append(now)
        _ip_request_timestamps[client_ip] = timestamps

    response = await call_next(request)

    # 3. Comprehensive OWASP Recommended Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    return response



@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format Pydantic request validation errors into standard Creo API error envelope."""
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = err.get("loc", [])
        field = ".".join(str(x) for x in loc if x != "body")
        msg = err.get("msg", "Validation error")
        messages.append(f"{field}: {msg}" if field else msg)
    message = "; ".join(messages) if messages else "Invalid request payload"
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": {"errors": errors},
            }
        },
    )

# API v1 feature routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(portal_dashboard.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(deliverables.router, prefix="/api/v1")
app.include_router(deliverables.portal_router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(tasks.router)
app.include_router(admin.router, prefix="/api/v1")
app.include_router(admin.router)
app.include_router(notifications.router, prefix="/api/v1")


import os
from fastapi.staticfiles import StaticFiles

_static_dir = os.path.join(os.path.dirname(__file__), "static")
_uploads_dir = os.path.join(_static_dir, "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")



@app.get("/", tags=["Root"])
async def root(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Root endpoint — returns API service status or handles direct Google OAuth browser redirects."""
    if code:
        from app.routers.auth import _process_google_code

        data = await _process_google_code(code, "https://creo-fhhl.onrender.com", db)
        token = data["access_token"]
        frontend_base = "http://localhost:5173"
        if state and (state.startswith("http://") or state.startswith("https://")):
            frontend_base = state.rstrip("/")
        return RedirectResponse(
            url=f"{frontend_base}/auth/google/callback?token={urllib.parse.quote(token)}"
        )
    return {
        "name": "Creo API",
        "status": "online",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check() -> JSONResponse:
    """Verify live connectivity to PostgreSQL and Redis.

    Performs a real `SELECT 1` on the database engine and `PING` on Redis.
    """
    db_status = "ok"
    redis_status = "ok"
    errors: dict[str, str] = {}

    # Check PostgreSQL database connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        errors["db"] = str(e)
        logger.error("health_check_database_failed", error=str(e))

    # Check Redis connectivity
    try:
        if settings.REDIS_URL.startswith("fakeredis"):
            from fakeredis import aioredis as fake_aioredis

            r = fake_aioredis.FakeRedis(decode_responses=True)
            ping_res = await r.ping()
        else:
            try:
                r = aioredis.from_url(  # type: ignore[no-untyped-call]
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=1.0,
                )
                ping_res = await r.ping()
                await r.aclose()
            except Exception as conn_err:
                if settings.ENVIRONMENT == "development":
                    from fakeredis import aioredis as fake_aioredis

                    r = fake_aioredis.FakeRedis(decode_responses=True)
                    ping_res = await r.ping()
                    logger.info("health_check_redis_local_fallback", original_error=str(conn_err))
                else:
                    raise conn_err
        if not ping_res:
            redis_status = "error"
            errors["redis"] = "Ping returned falsy value"
        await r.aclose()
    except Exception as e:
        redis_status = "error"
        errors["redis"] = str(e)
        logger.error("health_check_redis_failed", error=str(e))

    overall_status = "ok" if (db_status == "ok" and redis_status == "ok") else "degraded"
    http_code = (
        status.HTTP_200_OK if db_status == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    payload: dict[str, Any] = {
        "status": overall_status,
        "db": db_status,
        "redis": redis_status,
        "version": settings.VERSION,
    }
    if errors:
        payload["details"] = errors

    return JSONResponse(status_code=http_code, content=payload)
