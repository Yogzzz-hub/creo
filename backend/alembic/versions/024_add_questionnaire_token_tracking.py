"""Add token tracking columns to questionnaires

Revision ID: 024
Revises: 023
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa


revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "questionnaires",
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "questionnaires",
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "questionnaires",
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("questionnaires", "total_tokens")
    op.drop_column("questionnaires", "completion_tokens")
    op.drop_column("questionnaires", "prompt_tokens")
