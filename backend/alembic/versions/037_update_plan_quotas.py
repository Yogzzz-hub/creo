"""Update plan quotas to new pricing model

Revision ID: 037
Revises: 036
Create Date: 2026-07-22

"""
from alembic import op

revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE plans SET
            poster_quota = CASE name
                WHEN 'starter' THEN 8
                WHEN 'growth'  THEN 12
                WHEN 'pro'     THEN 16
            END,
            reel_quota = CASE name
                WHEN 'starter' THEN 4
                WHEN 'growth'  THEN 8
                WHEN 'pro'     THEN 12
            END,
            story_quota = CASE name
                WHEN 'starter' THEN 10
                WHEN 'growth'  THEN 15
                WHEN 'pro'     THEN 20
            END
        WHERE name IN ('starter', 'growth', 'pro')
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE plans SET
            poster_quota = CASE name
                WHEN 'starter' THEN 3
                WHEN 'growth'  THEN 6
                WHEN 'pro'     THEN 6
            END,
            reel_quota = CASE name
                WHEN 'starter' THEN 2
                WHEN 'growth'  THEN 4
                WHEN 'pro'     THEN 4
            END,
            story_quota = CASE name
                WHEN 'starter' THEN 3
                WHEN 'growth'  THEN 6
                WHEN 'pro'     THEN 9
            END
        WHERE name IN ('starter', 'growth', 'pro')
    """)
