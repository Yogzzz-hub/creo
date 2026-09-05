"""Create tasks table

Revision ID: 010
Revises: 009
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tasks",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_to", sa.UUID(), sa.ForeignKey("team_members.id"), nullable=True),
        sa.Column("assigned_by", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("deliverable_type", sa.dialects.postgresql.ENUM(
            "poster", "reel", "story",
            name="deliverable_type", create_type=False
        ), nullable=False),
        sa.Column("content_brief", sa.Text(), nullable=True),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "pending", "in_progress", "submitted", "approved", "revision", "overdue",
            name="task_status", create_type=False
        ), nullable=False, server_default="pending"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_addon", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("addon_id", sa.UUID(), nullable=True),
        sa.Column("calendar_entry_id", sa.UUID(), nullable=True),
        sa.Column("assignment_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_tasks_client_id", "tasks", ["client_id"])
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"])
    op.create_index("ix_tasks_calendar_entry_id", "tasks", ["calendar_entry_id"])

    op.execute("""
        CREATE TRIGGER update_tasks_updated_at
            BEFORE UPDATE ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks")
    op.drop_index("ix_tasks_calendar_entry_id", table_name="tasks")
    op.drop_index("ix_tasks_due_date", table_name="tasks")
    op.drop_index("ix_tasks_status", table_name="tasks")
    op.drop_index("ix_tasks_assigned_to", table_name="tasks")
    op.drop_index("ix_tasks_client_id", table_name="tasks")
    op.drop_table("tasks")
