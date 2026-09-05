"""Create content_calendar table

Revision ID: 009
Revises: 008
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_calendar",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content_plan_id", sa.UUID(), sa.ForeignKey("content_plans.id"), nullable=True),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("deliverable_type", sa.dialects.postgresql.ENUM(
            "poster", "reel", "story",
            name="deliverable_type", create_type=False
        ), nullable=False),
        sa.Column("content_topic", sa.Text(), nullable=True),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "draft", "scheduled", "in_progress", "ready_for_review", "approved", "rejected",
            name="calendar_entry_status", create_type=False
        ), nullable=False, server_default="draft"),
        sa.Column("linked_task_id", sa.UUID(), nullable=True),
        sa.Column("linked_deliverable_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_content_calendar_client_id", "content_calendar", ["client_id"])
    op.create_index("ix_content_calendar_content_plan_id", "content_calendar", ["content_plan_id"])
    op.create_index("ix_content_calendar_scheduled_date", "content_calendar", ["scheduled_date"])

    op.execute("""
        CREATE TRIGGER update_content_calendar_updated_at
            BEFORE UPDATE ON content_calendar
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_content_calendar_updated_at ON content_calendar")
    op.drop_index("ix_content_calendar_scheduled_date", table_name="content_calendar")
    op.drop_index("ix_content_calendar_content_plan_id", table_name="content_calendar")
    op.drop_index("ix_content_calendar_client_id", table_name="content_calendar")
    op.drop_table("content_calendar")
