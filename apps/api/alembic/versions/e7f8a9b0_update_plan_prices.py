"""Update plan prices to ₹25,000 / ₹50,000 / ₹95,000

Revision ID: e7f8a9b0
Revises: e593ce1857e0
Create Date: 2026-07-10

"""
from alembic import op


revision = "e7f8a9b0"
down_revision = "e593ce1857e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE plans SET monthly_price = CASE
            WHEN name = 'starter' THEN 25000.00
            WHEN name = 'growth' THEN 50000.00
            WHEN name = 'pro' THEN 95000.00
        END
        WHERE name IN ('starter', 'growth', 'pro')
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE plans SET monthly_price = CASE
            WHEN name = 'starter' THEN 4999.00
            WHEN name = 'growth' THEN 9999.00
            WHEN name = 'pro' THEN 19999.00
        END
        WHERE name IN ('starter', 'growth', 'pro')
    """)
