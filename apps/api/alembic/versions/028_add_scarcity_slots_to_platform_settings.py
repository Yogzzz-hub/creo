"""add_scarcity_slots_to_platform_settings

Revision ID: 028
Revises: 027
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "platform_settings",
        sa.Column("scarcity_slots_available", sa.Integer(), nullable=False, server_default="5"),
    )


def downgrade() -> None:
    op.drop_column("platform_settings", "scarcity_slots_available")
