"""add_scarcity_slots_to_platform_settings

Revision ID: 029
Revises: 028
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "platform_settings",
        sa.Column("scarcity_slots_available", sa.Integer(), nullable=False, server_default="5"),
    )


def downgrade() -> None:
    op.drop_column("platform_settings", "scarcity_slots_available")
