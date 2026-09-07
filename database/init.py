#!/usr/bin/env python3
"""
Creo Platform Database Initializer & Migration Runner.
Executes schema.sql and seed_data.sql against the configured PostgreSQL database.
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment from root .env if present
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://creo_user:creo_password@localhost:5432/creo_db"
)

# Convert asyncpg connection string if necessary
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


def run_sql_file(cursor, filepath: Path):
    print(f"Executing: {filepath.name}...")
    with open(filepath, "r", encoding="utf-8") as f:
        sql = f.read()
    cursor.execute(sql)
    print(f"✓ {filepath.name} executed successfully.")


def main():
    print("=" * 60)
    print("  CREO DATABASE INITIALIZATION & MIGRATION")
    print("=" * 60)
    print(f"Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()

        current_dir = Path(__file__).resolve().parent

        # 1. Apply Schema
        schema_file = current_dir / "schema.sql"
        if schema_file.exists():
            run_sql_file(cursor, schema_file)
        else:
            print(f"Error: {schema_file} not found.")
            sys.exit(1)

        # 2. Apply Seed Data
        seed_file = current_dir / "seed_data.sql"
        if seed_file.exists():
            run_sql_file(cursor, seed_file)

        cursor.close()
        conn.close()

        print("\n🎉 Database setup and demo seeding completed successfully!")
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
