"""Database engine, session factory, and FastAPI get_db dependency."""

import contextvars
import os
import sys
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Request
from sqlalchemy import event, text
from sqlalchemy.exc import DisconnectionError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings
from app.core.performance import request_timings

# Context variables for RLS
current_agency_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_agency", default=None)
is_platform_admin_ctx: contextvars.ContextVar[bool] = contextvars.ContextVar("is_platform_admin", default=False)

_db_url = (settings.DATABASE_URL or "").strip().strip("'").strip('"')

# PgBouncer / Supabase transaction-pooler safe asyncpg settings:
# - statement_cache_size=0 disables asyncpg's own statement cache
# - prepared_statement_cache_size=0 disables SQLAlchemy's prepared statement cache
# - unique prepared statement names avoid "prepared statement already exists"
#   collisions when pgbouncer hands the same server connection to another client
_connect_args: dict[str, Any] = {
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
    "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
}


def _needs_nullpool() -> bool:
    """Processes that spin up a fresh event loop per job (Celery tasks call
    asyncio.run per task, pytest-asyncio per test) cannot share pooled
    connections, because asyncpg connections are bound to the loop that
    opened them."""
    if settings.DB_USE_NULLPOOL:
        return True
    argv0 = os.path.basename(sys.argv[0]) if sys.argv else ""
    return "celery" in argv0 or "pytest" in sys.modules


if _needs_nullpool():
    engine = create_async_engine(_db_url, connect_args=_connect_args, poolclass=NullPool)
else:
    # Keep warm connections so each request skips the TCP + TLS + auth handshake
    # (and asyncpg's per-connection type introspection), which previously added
    # hundreds of milliseconds to every single API call.
    engine = create_async_engine(
        _db_url,
        connect_args=_connect_args,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
        pool_timeout=30,
    )

    # Liveness-check a pooled connection only when it has been idle for a while.
    # pool_pre_ping would cost ~3 extra round trips on every request, while a
    # connection that was used moments ago is almost certainly still healthy.
    _IDLE_PING_SECONDS = 30.0

    @event.listens_for(engine.sync_engine, "checkin")
    def _record_checkin(dbapi_connection: Any, connection_record: Any) -> None:
        connection_record.info["last_checkin"] = time.monotonic()

    @event.listens_for(engine.sync_engine, "checkout")
    def _ping_if_idle(dbapi_connection: Any, connection_record: Any, connection_proxy: Any) -> None:
        last_checkin = connection_record.info.get("last_checkin")
        if last_checkin is None or time.monotonic() - last_checkin < _IDLE_PING_SECONDS:
            return
        try:
            engine.dialect.do_ping(dbapi_connection)
        except Exception as err:
            # Makes the pool discard this connection and transparently open a new one
            raise DisconnectionError() from err

# Apply RLS context on every new transaction
@event.listens_for(engine.sync_engine, "begin")
def receive_begin(conn: Any) -> None:
    agency_id = current_agency_ctx.get()
    is_admin = is_platform_admin_ctx.get()
    
    # PostgreSQL SET does not accept bound parameters. set_config safely sets
    # transaction-local values, combining tenant and administrator context in one
    # round trip when an agency exists. Preserve the unset tenant for global actors.
    statement = "SELECT set_config('app.is_platform_admin', :admin, true)"
    params = {"admin": "true" if is_admin else "false"}
    if agency_id:
        statement += ", set_config('app.current_agency', :agency, true)"
        params["agency"] = str(agency_id)
    conn.execute(text(statement), params)



@event.listens_for(engine.sync_engine, "before_cursor_execute")
def _start_query_timer(conn: Any, cursor: Any, statement: Any, parameters: Any, context: Any, executemany: bool) -> None:
    context._creo_started = time.perf_counter()


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def _finish_query_timer(conn: Any, cursor: Any, statement: Any, parameters: Any, context: Any, executemany: bool) -> None:
    timings = request_timings.get()
    if timings is not None:
        timings.db_ms += (time.perf_counter() - context._creo_started) * 1000
        timings.db_queries += 1

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
async_session_factory = AsyncSessionLocal


@asynccontextmanager
async def tenant_session(db: AsyncSession, agency_id: str | uuid.UUID | None, is_platform_admin: bool = False) -> AsyncGenerator[AsyncSession, None]:
    """Set RLS context without owning the caller's transaction boundaries.

    Workers commit per assignment and AI generation releases its transaction before
    network calls. Wrapping those operations in db.begin() would prohibit subsequent
    queries after their first commit/rollback. The begin event applies this context
    whenever the caller starts the next transaction.
    """
    t_agency = current_agency_ctx.set(str(agency_id) if agency_id else None)
    t_admin = is_platform_admin_ctx.set(is_platform_admin)
    try:
        yield db
    finally:
        current_agency_ctx.reset(t_agency)
        is_platform_admin_ctx.reset(t_admin)


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields a database session and guarantees closure.
    Also extracts JWT token to set tenant contextvars for RLS.
    """
    # 1. Extract tenant context from token without blocking (for unauthenticated routes)
    agency_id = None
    is_admin = False
    
    if request:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[7:]
            try:
                from app.core.security import decode_token
                payload = decode_token(token)
                agency_id = payload.get("agency_id")
                if payload.get("role") == "super_admin":
                    is_admin = True
            except Exception:
                pass

    # 2. Set context variables for this request
    t_agency = current_agency_ctx.set(agency_id)
    t_admin = is_platform_admin_ctx.set(is_admin)

    try:
        async with AsyncSessionLocal() as session:
            yield session
    finally:
        current_agency_ctx.reset(t_agency)
        is_platform_admin_ctx.reset(t_admin)
