"""add instagram_username to users

Revision ID: 036
Revises: 035
Create Date: 2026-07-13

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
        sa.Column("instagram_username", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "instagram_username")
