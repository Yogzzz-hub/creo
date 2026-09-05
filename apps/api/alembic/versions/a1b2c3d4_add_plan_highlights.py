"""Add highlights column to plans table

Revision ID: a1b2c3d4
Revises: 023
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "plans",
        sa.Column("highlights", sa.JSON(), nullable=True),
    )

    op.execute("""
        UPDATE plans SET highlights = CASE
            WHEN name = 'starter' THEN '[
                "Social media management for 1 platform",
                "Basic content calendar",
                "Monthly performance report",
                "Email support"
            ]'::json
            WHEN name = 'growth' THEN '[
                "Social media management for 2 platforms",
                "Advanced content calendar with revisions",
                "Bi-weekly performance reports",
                "Priority email & chat support",
                "Dedicated account manager"
            ]'::json
            WHEN name = 'pro' THEN '[
                "Social media management for 3+ platforms",
                "Full content calendar with unlimited revisions",
                "Weekly performance reports & AI insights",
                "Priority support with live chat",
                "Instagram auto-publishing"
            ]'::json
        END
    """)

    op.alter_column("plans", "highlights", nullable=False, server_default=sa.text("'[]'::json"))


def downgrade() -> None:
    op.drop_column("plans", "highlights")
