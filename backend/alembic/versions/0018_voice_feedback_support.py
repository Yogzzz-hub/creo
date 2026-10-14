"""Add voice feedback columns to deliverable_history.

Revision ID: 0018_voice_feedback_support
Revises: 0017_bde_leads_and_activities
Create Date: 2026-10-14 14:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0018_voice_feedback_support"
down_revision = "0017_bde_leads_and_activities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE deliverable_history 
        ADD COLUMN IF NOT EXISTS voice_note_url TEXT,
        ADD COLUMN IF NOT EXISTS voice_note_duration INTEGER;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE deliverable_history 
        DROP COLUMN IF EXISTS voice_note_url,
        DROP COLUMN IF EXISTS voice_note_duration;
    """)
