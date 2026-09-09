"""Database engine, session factory, and FastAPI get_db dependency."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings

# PgBouncer transaction-mode safe connection args:
# statement_cache_size=0 disables asyncpg's prepared statement cache
_db_url = (settings.DATABASE_URL or "").strip().strip("'").strip('"')
engine = create_async_engine(
    _db_url,
    connect_args={"statement_cache_size": 0},
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
async_session_factory = AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields a database session and guarantees closure."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
