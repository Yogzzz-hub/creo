"""Database engine, session factory, and FastAPI get_db dependency."""

import contextvars
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Request
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings

# Context variables for RLS
current_agency_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_agency", default=None)
is_platform_admin_ctx: contextvars.ContextVar[bool] = contextvars.ContextVar("is_platform_admin", default=False)

_db_url = (settings.DATABASE_URL or "").strip().strip("'").strip('"')
engine = create_async_engine(
    _db_url,
    connect_args={"statement_cache_size": 0},
    poolclass=NullPool,
)

# Apply RLS context on every new transaction
@event.listens_for(engine.sync_engine, "begin")
def receive_begin(conn: Any) -> None:
    agency_id = current_agency_ctx.get()
    is_admin = is_platform_admin_ctx.get()
    
    if agency_id:
        conn.execute(text("SET LOCAL app.current_agency = :a").bindparams(a=agency_id))
    if is_admin:
        conn.execute(text("SET LOCAL app.is_platform_admin = 'true'"))
    else:
        conn.execute(text("SET LOCAL app.is_platform_admin = 'false'"))

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
async_session_factory = AsyncSessionLocal


@asynccontextmanager
async def tenant_session(db: AsyncSession, agency_id: str | uuid.UUID | None, is_platform_admin: bool = False) -> AsyncGenerator[AsyncSession, None]:
    """Context manager to explicitly set RLS for Celery tasks or custom blocks."""
    t_agency = current_agency_ctx.set(str(agency_id) if agency_id else None)
    t_admin = is_platform_admin_ctx.set(is_platform_admin)
    try:
        # Force a transaction if not already in one to apply the begin event
        if not db.in_transaction():
            async with db.begin():
                yield db
        else:
            yield db
    finally:
        current_agency_ctx.reset(t_agency)
        is_platform_admin_ctx.reset(t_admin)


async def get_db(request: Request = None) -> AsyncGenerator[AsyncSession, None]:
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
                import jwt
                payload = jwt.decode(token, options={"verify_signature": False})
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
