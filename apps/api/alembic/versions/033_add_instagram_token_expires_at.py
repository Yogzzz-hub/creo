"""add instagram_token_expires_at to users

Revision ID: 033
Revises: 032
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("instagram_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "instagram_token_expires_at")
