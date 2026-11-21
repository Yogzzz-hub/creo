"""FastAPI main application entrypoint.

Configures CORS, middleware, exception handlers, and the canonical health check.
"""

from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as aioredis
import urllib.parse
from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, get_db

from app.config import settings
from app.core.errors import AppError, app_error_handler
from app.core.build_info import get_build_revision
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
    platform,
    portal_dashboard,
    public,
    tasks,
    tenant,
    tickets,
    webhooks,
    chat,
    negotiations,
    instagram,
    publishing,
    bde,
)

logger = get_logger("app.main")


REQUIRED_HEAD_REVISION = "0027_repair_user_and_profile_schema"


async def check_database_schema_ready(session: AsyncSession) -> tuple[bool, str | None]:
    """Verify that required migrations and database schema exist and match canonical models."""
    try:
        # 1. Check alembic_version table and head revision
        has_alembic = await session.scalar(
            text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alembic_version');"
            )
        )
        if not has_alembic:
            return False, "alembic_version table is missing. Migrations have not been initialized."

        current_rev = await session.scalar(
            text("SELECT version_num FROM alembic_version LIMIT 1;")
        )
        if current_rev != REQUIRED_HEAD_REVISION:
            return False, f"Database is at revision '{current_rev}', expected head '{REQUIRED_HEAD_REVISION}'."

        # 2. Check essential tables
        for tbl in ("agencies", "users", "client_profiles", "staff_profiles"):
            exists = await session.scalar(
                text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :t);"
                ),
                {"t": tbl},
            )
            if not exists:
                return False, f"Required table '{tbl}' is missing from the database."

        # 3. Check essential columns and types
        cols = await session.execute(
            text("""
                SELECT table_name, column_name, data_type, udt_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND (
                      (table_name = 'users' AND column_name IN ('id', 'agency_id', 'role', 'account_status'))
                      OR (table_name = 'client_profiles' AND column_name = 'user_id')
                      OR (table_name = 'staff_profiles' AND column_name = 'user_id')
                      OR (table_name = 'agencies' AND column_name = 'id')
                  );
            """)
        )
        col_map = {(r[0], r[1]): (r[2], r[3]) for r in cols.fetchall()}

        uuid_cols = [
            ("users", "id"),
            ("users", "agency_id"),
            ("client_profiles", "user_id"),
            ("staff_profiles", "user_id"),
            ("agencies", "id"),
        ]
        for tbl, col in uuid_cols:
            if (tbl, col) not in col_map:
                return False, f"Required column '{tbl}.{col}' is missing from the database."
            dtype, udt = col_map[(tbl, col)]
            if dtype != "uuid" and udt != "uuid":
                return False, f"Column '{tbl}.{col}' has type '{dtype}' ({udt}), expected 'uuid'."

        for col in ("role", "account_status"):
            if ("users", col) not in col_map:
                return False, f"Required column 'users.{col}' is missing from the database."

        return True, None
    except Exception as exc:
        return False, f"Error validating database schema readiness: {exc}"


async def bootstrap_admin_accounts(db: AsyncSession) -> None:
    """Seed and ensure all core staff accounts exist with valid Admin123! credentials.
    Runs ONLY after required migrations are successful.
    """
    import uuid
    from app.models.user import User
    from app.models.enums import UserRole, AccountStatus
    from app.core.security import hash_password
    from sqlalchemy import select, func

    default_staff = [
        ("admin@creo.agency", "auth_admin_001", "Creo Super Admin", UserRole.SUPER_ADMIN),
        ("superadmin@creo.agency", "auth_superadmin_001", "Creo Platform Super Admin", UserRole.SUPER_ADMIN),
        ("ops.admin@creo.agency", "auth_ops_admin", "Aarav Sharma (Operations Admin)", UserRole.ADMIN),
        ("creative.admin@creo.agency", "auth_creative_admin", "Pooja Nambiar (Creative Admin)", UserRole.ADMIN),
        ("lead.alpha@creo.agency", "auth_lead_alpha", "Vikram Malhotra (Lead - Pod Alpha)", UserRole.TEAM_LEAD),
        ("editor.alpha@creo.agency", "auth_editor_alpha", "Karthik Raja (Editor - Pod Alpha)", UserRole.EDITOR),
        ("designer.alpha@creo.agency", "auth_designer_alpha", "Ananya Deshmukh (Designer - Pod Alpha)", UserRole.DESIGNER),
        ("lead.beta@creo.agency", "auth_lead_beta", "Sarah Connor (Lead - Pod B)", UserRole.TEAM_LEAD),
        ("lead@creo.agency", "auth_lead_generic", "Sarah Connor (Lead - Pod B)", UserRole.TEAM_LEAD),
        ("editor@creo.agency", "auth_editor_generic", "Pranav Rajesh (Video)", UserRole.EDITOR),
        ("designer@creo.agency", "auth_designer_generic", "Rishi Varma (Design)", UserRole.DESIGNER),
    ]
    default_agency_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    admin_pw_hash = hash_password("Admin123!")

    for s_email, s_auth, s_name, s_role in default_staff:
        res = await db.execute(select(User).where(func.lower(User.email) == s_email.lower()))
        user_record = res.scalar_one_or_none()
        if not user_record:
            user_record = User(
                id=uuid.uuid4(),
                agency_id=default_agency_id,
                email=s_email.lower(),
                auth_id=s_auth,
                full_name=s_name,
                role=s_role,
                account_status=AccountStatus.ACTIVE,
                hashed_password=admin_pw_hash,
                must_reset_password=False,
            )
            db.add(user_record)
        else:
            user_record.role = s_role
            user_record.account_status = AccountStatus.ACTIVE
            user_record.hashed_password = admin_pw_hash
            user_record.must_reset_password = False
            if not user_record.agency_id:
                user_record.agency_id = default_agency_id
    await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown."""
    setup_logging()
    logger.info(
        "server_starting",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
    )
    # 1. Deployment and database schema readiness verification
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        ready, reason = await check_database_schema_ready(db)
        if not ready:
            logger.critical("database_schema_not_ready", reason=reason)
            raise RuntimeError(f"Database schema is not ready for application startup: {reason}")

        # 2. Seed admin accounts only after verified migrations
        logger.info("bootstrapping_admin_accounts")
        await bootstrap_admin_accounts(db)
    import asyncio
    from app.services.instagram_test_post import scheduled_test_loop
    from app.workers.tasks.scheduler import publishing_recovery_loop
    test_scheduler = asyncio.create_task(scheduled_test_loop())
    publishing_scheduler = asyncio.create_task(publishing_recovery_loop())
    from app.services.crm_reminders import reminder_loop
    crm_scheduler = asyncio.create_task(reminder_loop())
    try:
        yield
    finally:
        test_scheduler.cancel()
        publishing_scheduler.cancel()
        crm_scheduler.cancel()
        from contextlib import suppress
        with suppress(asyncio.CancelledError):
            await test_scheduler
        with suppress(asyncio.CancelledError):
            await publishing_scheduler
        with suppress(asyncio.CancelledError):
            await crm_scheduler
    logger.info("server_shutting_down")
    await engine.dispose()


app = FastAPI(
    title="Creo API",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Compress large JSON responses, leaving streaming responses to Starlette.
app.add_middleware(GZipMiddleware, minimum_size=1200, compresslevel=4)

# Request ID tracking middleware
app.add_middleware(RequestIdMiddleware)

# CORS configuration (explicit origins + preview regex for Vercel, Cloudflare Pages/Workers, and Render,
# plus the Capacitor apps: https://localhost on Android, capacitor://localhost on iOS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9\-_]+\.)*(vercel\.app|pages\.dev|workers\.dev|onrender\.com)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^(https|capacitor):\/\/localhost$",
    allow_credentials=True,
    max_age=3600,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id", "Server-Timing"],
)

# Standardized application error handler
app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]


# In-memory IP-based rate limiting dictionary
_ip_request_timestamps: dict[str, list[float]] = {}
MAX_REQUESTS_PER_WINDOW = 200  # 200 requests per 10-second window per IP
WINDOW_SECONDS = 10
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 Megabytes max request size for video/image uploads


@app.middleware("http")
async def security_and_rate_limit_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Zero-trust security middleware:
    - Payload size limitation to prevent DOS / memory exhaustion
    - Sliding-window IP request throttling
    - Comprehensive OWASP security headers injection
    """
    import time

    client_ip = request.client.host if request.client else "unknown"
    origin = request.headers.get("origin")

    # Helper to attach CORS to early returns
    def _add_cors(res: JSONResponse) -> JSONResponse:
        if origin:
            res.headers["Access-Control-Allow-Origin"] = origin
            res.headers["Access-Control-Allow-Credentials"] = "true"
            res.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
            res.headers["Access-Control-Allow-Headers"] = "*"
        return res

    # 1. Payload size check (exempt upload routes for media files)
    if not request.url.path.endswith("/upload") and not request.url.path.endswith("/upload-intent"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_CONTENT_LENGTH:
            return _add_cors(
                JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": f"Request payload exceeds maximum allowed size of {MAX_CONTENT_LENGTH // (1024*1024)}MB.",
                        }
                    },
                )
            )

    # 2. IP-based request throttling / anti-DDoS (exempt health endpoints and root probes)
    if not (request.url.path in {"/", "/health", "/api/v1/health"} or request.url.path.endswith("/health")):
        now = time.time()
        cutoff = now - WINDOW_SECONDS
        timestamps = [t for t in _ip_request_timestamps.get(client_ip, []) if t > cutoff]
        if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
            _ip_request_timestamps[client_ip] = timestamps
            return _add_cors(
                JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many requests from your IP address. Please slow down.",
                        }
                    },
                )
            )
        timestamps.append(now)
        _ip_request_timestamps[client_ip] = timestamps

    # Invalidate both sides of a write: reads during the mutation must not
    # republish an older snapshot after its transaction commits.
    invalidates_dashboard = request.method in {"POST", "PUT", "PATCH", "DELETE"} and not request.url.path.startswith("/api/v1/auth/")
    if invalidates_dashboard:
        from app.core.dashboard_cache import invalidate_dashboard_cache
        await invalidate_dashboard_cache()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error("unhandled_request_exception", error=str(exc), path=request.url.path)
        return _add_cors(
            JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected server error occurred.",
                        "details": str(exc),
                    }
                },
            )
        )

    finally:
        if invalidates_dashboard:
            await invalidate_dashboard_cache()

    # 3. Comprehensive OWASP Recommended Security Headers (Excluding CSP which breaks cross-origin SPA APIs)
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
    resp = JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": {"errors": errors},
            }
        },
    )
    origin = request.headers.get("origin")
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler ensuring unhandled exceptions always return structured error and CORS headers."""
    logger.error("unhandled_global_exception", error=str(exc), path=request.url.path)
    resp = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "details": str(exc),
            }
        },
    )
    origin = request.headers.get("origin")
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp

# API v1 feature routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.users_router, prefix="/api/v1")
app.include_router(instagram.router, prefix="/api/v1")
app.include_router(publishing.router, prefix="/api/v1")
from app.routers import revenue_crm
app.include_router(revenue_crm.router, prefix="/api/v1")
app.include_router(revenue_crm.public_router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(portal_dashboard.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(calendar.ops_router, prefix="/api/v1")
app.include_router(calendar.portal_router, prefix="/api/v1")
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(deliverables.router, prefix="/api/v1")
app.include_router(deliverables.portal_router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(tasks.router)
app.include_router(admin.router, prefix="/api/v1")
app.include_router(negotiations.router, prefix="/api/v1/negotiations")
app.include_router(admin.router)
app.include_router(platform.router, prefix="/api/v1")
app.include_router(tenant.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(bde.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(public.router)


import os
from fastapi.staticfiles import StaticFiles

_static_dir = os.path.join(os.path.dirname(__file__), "static")
_uploads_dir = os.path.join(_static_dir, "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")



@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root(
    request: Request,
    code: str | None = None,
    state: str | None = None,
) -> Any:
    """Root endpoint — returns API service status or handles direct Google OAuth browser redirects."""
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="application/json")

    if code:
        from app.db.session import AsyncSessionLocal
        from app.routers.auth import _process_google_code

        async with AsyncSessionLocal() as session:
            data = await _process_google_code(code, "https://creo-dsxr.onrender.com", session)
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
        "build_revision": get_build_revision(),
        "docs": "/docs",
        "health": "/health",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/api/v1/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check(request: Request) -> Response:
    """Verify live connectivity to PostgreSQL and Redis.

    Performs a real `SELECT 1` on the database engine and `PING` on Redis.
    """
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="application/json")
    db_status = "ok"
    redis_status = "ok"
    errors: dict[str, str] = {}

    # Check PostgreSQL database connectivity and migration/schema readiness
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            ready, reason = await check_database_schema_ready(db)
            if not ready:
                db_status = "schema_error"
                errors["schema"] = f"Database schema is not ready: {reason}"
                logger.error("health_check_schema_unready", error=reason)
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
                    socket_timeout=3.0,
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
        "build_revision": get_build_revision(),
    }
    if errors:
        payload["details"] = errors

    return JSONResponse(status_code=http_code, content=payload)
