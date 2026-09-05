"""Add shoot_day to deliverable_type enum

Revision ID: 041
Revises: 037
Create Date: 2026-08-05

"""
from alembic import op

revision = "041"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TYPE deliverable_type ADD VALUE IF NOT EXISTS 'shoot_day'
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values directly.
    # This is a no-op; if you need to revert, create a new enum type
    # without 'shoot_day' and migrate the data.
    pass
