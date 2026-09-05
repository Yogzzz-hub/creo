"""Create task_status_history table

Revision ID: 029
Revises: 028
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa


revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_status_history",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "task_id",
            sa.UUID(),
            sa.ForeignKey("tasks.id"),
            nullable=False,
        ),
        sa.Column(
            "changed_by_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("old_status", sa.Text(), nullable=False),
        sa.Column("new_status", sa.Text(), nullable=False),
        sa.Column(
            "changed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_task_status_history_task_id",
        "task_status_history",
        ["task_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_status_history_task_id", table_name="task_status_history")
    op.drop_table("task_status_history")
