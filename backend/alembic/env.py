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
if not direct_db_url or ("localhost" in direct_db_url and "localhost" not in (settings.DATABASE_URL or "")):
    direct_db_url = settings.DATABASE_URL or direct_db_url

# If the URL points to Supabase transaction pooler (port 6543), switch to direct port 5432
if ":6543" in direct_db_url:
    direct_db_url = direct_db_url.replace(":6543", ":5432")

# Ensure asyncpg dialect is present for async engine
for prefix in ("postgres://", "postgresql://"):
    if direct_db_url.startswith(prefix):
        direct_db_url = "postgresql+asyncpg://" + direct_db_url[len(prefix):]
        break

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
        transaction_per_migration=True,
    )

    context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    # Ensure alembic_version column is wide enough for descriptive revisions
    try:
        from sqlalchemy import text
        connection.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(64) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num));"))
        connection.execute(text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64);"))
        connection.execute(text("""
            INSERT INTO alembic_version (version_num)
            SELECT '0026_revenue_crm'
            WHERE NOT EXISTS (SELECT 1 FROM alembic_version)
              AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');
        """))
        connection.commit()
    except Exception:
        pass

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        transaction_per_migration=True,
    )

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
