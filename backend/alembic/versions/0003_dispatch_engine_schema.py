"""Add dispatch engine schema fields: daily_points, last_assigned_at, effort_points, is_revision, parent_assignee_id, calendar status and client timezone.

Revision ID: 0003_dispatch_engine
Revises: 0002_views
Create Date: 2026-09-10 21:20:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003_dispatch_engine'
down_revision = '0002_views'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. staff_profiles
    op.execute("ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS daily_points INT DEFAULT 8 NOT NULL;")
    op.execute("ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;")

    # 2. tasks
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort_points INT DEFAULT 1 NOT NULL;")
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_revision BOOLEAN DEFAULT false NOT NULL;")
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_window ON tasks(assigned_to, due_date) WHERE status IN ('in_production', 'internal_qa');")

    # 3. content_calendar
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' NOT NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS slot_kind VARCHAR(50);")

    # 4. client_profiles
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL;")
    op.execute("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS calendar_template JSONB DEFAULT NULL;")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_tasks_window;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS parent_assignee_id;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS is_revision;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS effort_points;")
    op.execute("ALTER TABLE staff_profiles DROP COLUMN IF EXISTS last_assigned_at;")
    op.execute("ALTER TABLE staff_profiles DROP COLUMN IF EXISTS daily_points;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS slot_kind;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS is_locked;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS status;")
    op.execute("ALTER TABLE client_profiles DROP COLUMN IF EXISTS calendar_template;")
    op.execute("ALTER TABLE client_profiles DROP COLUMN IF EXISTS timezone;")
