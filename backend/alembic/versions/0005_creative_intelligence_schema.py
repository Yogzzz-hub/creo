"""Add creative intelligence fields: sub_skills on staff_profiles; blueprint, preferred_sub_skill, concept_status on tasks; slot_strategy, flex_deadline, blueprint, selected_hook on content_calendar; revisions_count on deliverables.

Revision ID: 0005_creative_intelligence
Revises: 0004_dispatch_engine
Create Date: 2026-09-10 22:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005_creative_intelligence'
down_revision = '0004_dispatch_engine'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. staff_profiles: sub_skills
    op.execute("ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS sub_skills TEXT[] DEFAULT '{}'::text[] NOT NULL;")

    # 2. tasks: blueprint, preferred_sub_skill, concept_status
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS preferred_sub_skill VARCHAR(50);")
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS concept_status VARCHAR(30) DEFAULT 'approved' NOT NULL;")
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blueprint JSONB DEFAULT NULL;")

    # 3. deliverables: revisions_count
    op.execute("ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS revisions_count INT DEFAULT 0 NOT NULL;")

    # 4. content_calendar: slot_strategy, flex_deadline, concept_status, blueprint, selected_hook
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS slot_strategy VARCHAR(20) DEFAULT 'anchor' NOT NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS flex_deadline DATE;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS concept_status VARCHAR(30) DEFAULT 'approved' NOT NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS blueprint JSONB DEFAULT NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS selected_hook JSONB DEFAULT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS selected_hook;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS blueprint;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS concept_status;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS flex_deadline;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS slot_strategy;")
    op.execute("ALTER TABLE deliverables DROP COLUMN IF EXISTS revisions_count;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS blueprint;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS concept_status;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS preferred_sub_skill;")
    op.execute("ALTER TABLE staff_profiles DROP COLUMN IF EXISTS sub_skills;")
