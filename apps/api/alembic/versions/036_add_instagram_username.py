"""add instagram_username to users

Revision ID: 036
Revises: 035
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa


revision = "036b"
down_revision = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_username TEXT"
    )


def downgrade() -> None:
    op.drop_column("users", "instagram_username")
