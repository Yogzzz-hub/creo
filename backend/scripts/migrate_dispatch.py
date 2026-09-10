import asyncio
import sys

sys.path.insert(0, ".")

from app.db.session import async_session_factory
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_points INT DEFAULT 8 NOT NULL;",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort_points INT DEFAULT 1 NOT NULL;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_revision BOOLEAN DEFAULT false NOT NULL;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;",
    "CREATE INDEX IF NOT EXISTS idx_tasks_window ON tasks(assigned_to, due_date) WHERE status IN ('in_production', 'internal_qa');",
    "ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' NOT NULL;",
    "ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;",
    "ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS slot_kind VARCHAR(50);",
    "ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL;",
    "ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS calendar_template JSONB DEFAULT NULL;",
]

async def main():
    async with async_session_factory() as session:
        for stmt in STATEMENTS:
            print("Applying:", stmt)
            await session.execute(text(stmt))
        await session.commit()
    print("ALL MIGRATION STATEMENTS APPLIED SUCCESSFULLY")

if __name__ == "__main__":
    asyncio.run(main())
