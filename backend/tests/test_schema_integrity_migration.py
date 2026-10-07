"""Forward repair in isolated, rolled-back schemas of the opt-in test database."""

import importlib.util
import os
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

TEST_URL = os.environ.get("CREO_TEST_DATABASE_URL")


@pytest.mark.skipif(not TEST_URL, reason="explicit test database required")
@pytest.mark.asyncio
@pytest.mark.parametrize("existing_keys", [False, True])
async def test_schema_repair_preserves_data_and_enforces_unique_ownership(existing_keys):
    path = Path(__file__).parents[1] / "alembic/versions/0010_schema_integrity.py"
    spec = importlib.util.spec_from_file_location("integrity_repair", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_async_engine(TEST_URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                schema = "repair_" + uuid.uuid4().hex
                await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
                await conn.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                for table, columns in migration.INTEGRITY_KEYS:
                    fields = ", ".join(f'"{column}" TEXT NOT NULL' for column in columns)
                    keys = ", ".join(f'"{column}"' for column in columns)
                    primary = f", PRIMARY KEY ({keys})" if existing_keys else ""
                    await conn.execute(text(f'CREATE TABLE "{table}" ({fields}{primary})'))
                    values = ", ".join("'preserved'" for _ in columns)
                    await conn.execute(text(f'INSERT INTO "{table}" VALUES ({values})'))
                await conn.execute(text("CREATE TABLE plans (name TEXT NOT NULL)"))
                await conn.execute(text("INSERT INTO plans VALUES ('growth'), ('growth')"))

                def apply(sync_conn):
                    with patch.object(
                        migration, "op", Operations(MigrationContext.configure(sync_conn))
                    ):
                        migration.upgrade()
                    return {
                        table: inspect(sync_conn).get_indexes(table)
                        for table, _ in migration.INTEGRITY_KEYS
                    }

                first = await conn.run_sync(apply)
                assert first == await conn.run_sync(apply)
                for table, columns in migration.INTEGRITY_KEYS:
                    if existing_keys:
                        assert first[table] == []  # PK already provides uniqueness.
                    else:
                        assert any(
                            i["unique"] and i["column_names"] == list(columns) for i in first[table]
                        )
                    savepoint = await conn.begin_nested()
                    values = ", ".join("'preserved'" for _ in columns)
                    with pytest.raises(IntegrityError):
                        await conn.execute(text(f'INSERT INTO "{table}" VALUES ({values})'))
                    await savepoint.rollback()
                    assert (
                        await conn.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
                    ).scalar_one() == 1
                assert (await conn.execute(text("SELECT COUNT(*) FROM plans"))).scalar_one() == 2
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()
