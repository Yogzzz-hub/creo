import logging

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, with_loader_criteria

from core.config import settings

logger = logging.getLogger(__name__)


def _get_async_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


engine = create_async_engine(
    _get_async_url(settings.DATABASE_URL),
    echo=False,
    pool_size=5,
    max_overflow=10,
    connect_args={"statement_cache_size": 0},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


@event.listens_for(Session, "do_orm_execute")
def _inject_soft_delete_filter(execute_state):
    if not execute_state.is_select:
        return
    if execute_state.session.info.get("skip_soft_delete_filter"):
        return
    from models.user import User
    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            User,
            lambda cls: cls.deleted_at.is_(None),
            include_aliases=True,
        )
    )


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db_unfiltered():
    async with async_session() as session:
        session.info["skip_soft_delete_filter"] = True
        try:
            yield session
        finally:
            await session.close()
