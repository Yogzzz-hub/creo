"""Add time-tracking columns to tasks

Revision ID: 027
Revises: 026
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa


revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "tasks",
        sa.Column("actual_minutes", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("tasks", "actual_minutes")
    op.drop_column("tasks", "estimated_minutes")
