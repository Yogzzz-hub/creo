"""add_scarcity_slots_to_platform_settings

Revision ID: f6a7b8c9
Revises: e5f6a7b8
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "f6a7b8c9"
down_revision = "e5f6a7b8"
branch_labels = None
depends_on = ["031"]


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.drop_column("platform_settings", "scarcity_slots_available")
