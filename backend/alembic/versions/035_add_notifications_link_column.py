"""Add link column to notifications

Revision ID: 035
Revises: 034
Create Date: 2026-07-01

"""
from alembic import op
import sqlalchemy as sa


revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("link", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "link")
