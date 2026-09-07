#!/usr/bin/env python3
"""
Creo Platform — Database Management & Initialization Utility
============================================================
Provides unified CLI commands to inspect, initialize, migrate, and seed
the PostgreSQL database (supports Supabase cloud and local Docker Postgres).

Usage:
  python database/init.py --check     # Test connection and show version
  python database/init.py --schema    # Apply PostgreSQL schema (schema.sql)
  python database/init.py --seed      # Seed initial demo data (seed_data.sql)
  python database/init.py --stats     # Print row counts for all tables
  python database/init.py --all       # Run check, schema, and seed in sequence
"""

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Try to import sqlalchemy
try:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
except ImportError:
    print("Error: SQLAlchemy is required. Install with: pip install sqlalchemy asyncpg")
    sys.exit(1)


def get_db_url() -> str:
    """Retrieve database URL from .env or environment."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DIRECT_DATABASE_URL="):
                    return line.split("=", 1)[1].strip()
                if line.startswith("DATABASE_URL=") and "DIRECT_DATABASE_URL" not in os.environ:
                    url = line.split("=", 1)[1].strip()
                    if url:
                        return url

    return os.getenv(
        "DIRECT_DATABASE_URL",
        os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres",
        ),
    )


def split_sql_statements(sql_text: str) -> list[str]:
    """Split SQL text into discrete executable statements, respecting DO $$ blocks."""
    statements = []
    current_stmt = []
    in_dollar_block = False

    for line in sql_text.splitlines():
        trimmed = line.strip()
        # Track DO $$ blocks
        if "$$" in trimmed:
            in_dollar_block = not in_dollar_block

        current_stmt.append(line)

        if not in_dollar_block and trimmed.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt:
                statements.append(stmt)
            current_stmt = []

    remainder = "\n".join(current_stmt).strip()
    if remainder:
        statements.append(remainder)

    return statements


async def check_connection() -> bool:
    """Verify PostgreSQL connectivity and print system info."""
    db_url = get_db_url()
    # Mask password for display
    masked_url = re.sub(r":([^@]+)@", ":****@", db_url)
    print(f"\n📡 Connecting to: {masked_url}")

    try:
        engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT current_database(), current_user, version();"))
            row = res.fetchone()
            if row:
                print(f"✅ Connection Successful!")
                print(f"   • Database: {row[0]}")
                print(f"   • User:     {row[1]}")
                print(f"   • Engine:   {row[2].split(',')[0]}")
        await engine.dispose()
        return True
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return False


async def apply_schema() -> None:
    """Execute schema.sql to configure extensions, enums, tables, triggers, and views."""
    db_url = get_db_url()
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    if not schema_path.exists():
        print(f"❌ schema.sql not found at: {schema_path}")
        return

    print(f"\n⚙️  Applying PostgreSQL Schema from {schema_path.name}...")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    statements = split_sql_statements(sql_content)
    print(f"   Found {len(statements)} SQL statements to execute.")

    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    success = 0
    errors = 0

    async with engine.connect() as conn:
        for stmt in statements:
            if not stmt.strip():
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                success += 1
            except Exception as e:
                # Some objects might already exist
                errors += 1
                first_line = stmt.strip().splitlines()[0][:60]
                print(f"   ⚠️  Warning on statement [{first_line}...]: {e}")

    await engine.dispose()
    print(f"✅ Schema applied: {success} executed, {errors} skipped/warnings.")


async def apply_seeds(db_url_override: str | None = None) -> None:
    """Execute seed_data.sql to populate initial plans, staff, clients, and deliverables."""
    db_url = db_url_override or get_db_url()
    seed_path = Path(__file__).resolve().parent / "seed_data.sql"
    if not seed_path.exists():
        print(f"❌ seed_data.sql not found at: {seed_path}")
        return

    print(f"\n🌱 Seeding Initial Data from {seed_path.name}...")
    with open(seed_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    statements = split_sql_statements(sql_content)
    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    success = 0
    errors = 0

    async with engine.connect() as conn:
        for stmt in statements:
            if not stmt.strip():
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                success += 1
            except Exception as e:
                errors += 1
                first_line = stmt.strip().splitlines()[0][:60]
                print(f"   ⚠️  Warning on seed statement [{first_line}...]: {e}")

    await engine.dispose()
    print(f"✅ Seeding completed ({success} executed, {errors} skipped/warnings).")


async def print_stats() -> None:
    """Print current table row counts and summary statistics."""
    db_url = get_db_url()
    print("\n📊 Database Table Statistics:")
    print("─────────────────────────────────────────────────────────────")
    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})

    query = text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)

    async with engine.connect() as conn:
        res = await conn.execute(query)
        tables = [r[0] for r in res.fetchall()]

        for tbl in tables:
            try:
                count_res = await conn.execute(text(f"SELECT COUNT(*) FROM \"{tbl}\";"))
                count = count_res.scalar()
                print(f"  • {tbl.ljust(26)} : {count} rows")
            except Exception:
                print(f"  • {tbl.ljust(26)} : [read error]")

        # Check views
        print("\n🔍 Views & Materialized Views:")
        try:
            v_res = await conn.execute(text("SELECT COUNT(*) FROM v_client_onboarding;"))
            print(f"  • v_client_onboarding        : {v_res.scalar()} client stages tracked")
        except Exception:
            pass

        try:
            mv_res = await conn.execute(text("SELECT * FROM mv_exec_kpis;"))
            kpi_row = mv_res.fetchone()
            if kpi_row:
                print(f"  • mv_exec_kpis               : MRR ₹{kpi_row[1] / 100:,.0f} | Active Clients: {kpi_row[2]}")
        except Exception:
            pass

    print("─────────────────────────────────────────────────────────────")
    await engine.dispose()


async def main() -> None:
    parser = argparse.ArgumentParser(description="Creo Platform Database Tool")
    parser.add_argument("--check", action="store_true", help="Check database connectivity")
    parser.add_argument("--schema", action="store_true", help="Apply schema.sql")
    parser.add_argument("--seed", action="store_true", help="Apply seed_data.sql")
    parser.add_argument("--stats", action="store_true", help="Print table statistics")
    parser.add_argument("--all", action="store_true", help="Check, apply schema, seed, and show stats")

    args = parser.parse_args()

    # Default to check if no flags passed
    if not any([args.check, args.schema, args.seed, args.stats, args.all]):
        args.check = True
        args.stats = True

    if args.check or args.all:
        connected = await check_connection()
        if not connected and not args.all:
            return

    if args.schema or args.all:
        await apply_schema()

    if args.seed or args.all:
        await apply_seeds()

    if args.stats or args.all:
        await print_stats()


if __name__ == "__main__":
    asyncio.run(main())
