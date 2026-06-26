"""Add is_recommended column to plans table

Revision ID: 025
Revises: 024
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa


revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "plans",
        sa.Column("is_recommended", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.execute("""
        UPDATE plans SET is_recommended = true WHERE name = 'growth'
    """)


def downgrade() -> None:
    op.drop_column("plans", "is_recommended")
