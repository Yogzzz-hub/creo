import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import all models to ensure metadata is complete
import app.models  # noqa: F401
from alembic import context
from app.config import settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Invariant: Alembic migrations MUST read DIRECT_DATABASE_URL (port 5432)
# rather than PgBouncer connection pooler (port 6543).
# Reason: PgBouncer in transaction pooling mode prevents DDL operations, schema lock acquisition,
# and causes Prepared Statement Cache conflicts during migration runs.
direct_db_url = settings.DIRECT_DATABASE_URL
# Escape '%' as '%%' to prevent configparser interpolation errors with URL-encoded passwords
config.set_main_option("sqlalchemy.url", direct_db_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    # Auto-reconcile orphaned/unknown revisions in alembic_version table
    try:
        from sqlalchemy import text
        from alembic.script import ScriptDirectory

        script = ScriptDirectory.from_config(config)
        res = connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
        row = res.fetchone()
        if row and row[0]:
            current_db_rev = row[0]
            try:
                script.get_revision(current_db_rev)
            except Exception:
                heads = script.get_heads()
                if heads:
                    connection.execute(
                        text("UPDATE alembic_version SET version_num = :head"),
                        {"head": heads[0]},
                    )
                    connection.commit()
    except Exception:
        pass

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"statement_cache_size": 0},
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
