"""0008_calendar_sequencing_strategy

Adds sequencing strategy columns to content_calendar:
- pillar (text)
- funnel_stage (text: reach, authority, conversion)
- slot_source (text: original, repurpose)
- source_slot_id (uuid references content_calendar.id)
- story_role (text: teaser, echo, standalone, coverage)

Revision ID: 0008_calendar_sequencing_strategy
Revises: 0007_brand_questionnaire_and_dna
Create Date: 2026-09-13 16:30:00.000000
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_calendar_sequencing"
down_revision: str | None = "0007_brand_questionnaire_and_dna"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE content_calendar
      ADD COLUMN IF NOT EXISTS pillar TEXT,
      ADD COLUMN IF NOT EXISTS funnel_stage TEXT NOT NULL DEFAULT 'reach'
        CHECK (funnel_stage IN ('reach','authority','conversion')),
      ADD COLUMN IF NOT EXISTS slot_source TEXT NOT NULL DEFAULT 'original'
        CHECK (slot_source IN ('original','repurpose')),
      ADD COLUMN IF NOT EXISTS source_slot_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS story_role TEXT
        CHECK (story_role IS NULL OR story_role IN ('teaser','echo','standalone','coverage'));
    """)


def downgrade() -> None:
    op.execute("""
    ALTER TABLE content_calendar
      DROP COLUMN IF EXISTS story_role,
      DROP COLUMN IF EXISTS source_slot_id,
      DROP COLUMN IF EXISTS slot_source,
      DROP COLUMN IF EXISTS funnel_stage,
      DROP COLUMN IF EXISTS pillar;
    """)
