"""add_missing_indexes

Revision ID: e5f6a7b8
Revises: d4e5f6a7
Create Date: 2026-06-24

"""
from alembic import op


revision = "e5f6a7b8"
down_revision = "d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_gateway_subscription_id ON subscriptions (gateway_subscription_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_gateway_subscription_id ON subscriptions (gateway_subscription_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_questionnaires_user_id ON questionnaires (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_deliverables_submitted_by ON deliverables (submitted_by)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_escalations_task_id ON escalations (task_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_content_plans_client_id ON content_plans (client_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_not_deleted ON users (id) WHERE deleted_at IS NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_not_deleted")
    op.execute("DROP INDEX IF EXISTS ix_content_plans_client_id")
    op.execute("DROP INDEX IF EXISTS ix_escalations_task_id")
    op.execute("DROP INDEX IF EXISTS ix_deliverables_submitted_by")
    op.execute("DROP INDEX IF EXISTS ix_questionnaires_user_id")
    op.execute("DROP INDEX IF EXISTS ux_subscriptions_gateway_subscription_id")
    op.execute("DROP INDEX IF EXISTS ix_subscriptions_gateway_subscription_id")
