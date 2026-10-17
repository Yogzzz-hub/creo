"""Recognize the existing deployment marker; preserve unknown legacy voice DDL.

The deployed database already has deliverable_history voice_note_url and
voice_note_duration. This marker does not claim to recreate that unavailable
migration on a fresh database and never deletes the existing columns.
"""
revision = "0018_voice_feedback_support"
down_revision = "0016_merge_legacy_enhancements"
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
