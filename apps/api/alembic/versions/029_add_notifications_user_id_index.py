"""add_notifications_user_id_index

Revision ID: 029
Revises: 028
Create Date: 2026-06-24

"""
from alembic import op


revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_id")
