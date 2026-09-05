"""Add brand_summary column to users table.

Revision ID: 036
Revises: 035
Create Date: 2025-07-08
"""
from alembic import op
import sqlalchemy as sa

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("brand_summary", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "brand_summary")
