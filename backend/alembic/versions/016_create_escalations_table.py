"""Create escalations table

Revision ID: 016
Revises: 015
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "escalations",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", sa.UUID(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_to", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("severity", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("resolved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_escalations_task_id", "escalations", ["task_id"])
    op.create_index("ix_escalations_client_id", "escalations", ["client_id"])
    op.create_index("ix_escalations_status", "escalations", ["status"])
    op.create_index("ix_escalations_severity", "escalations", ["severity"])

    op.execute("""
        CREATE TRIGGER update_escalations_updated_at
            BEFORE UPDATE ON escalations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_escalations_updated_at ON escalations")
    op.drop_index("ix_escalations_severity", table_name="escalations")
    op.drop_index("ix_escalations_status", table_name="escalations")
    op.drop_index("ix_escalations_client_id", table_name="escalations")
    op.drop_index("ix_escalations_task_id", table_name="escalations")
    op.drop_table("escalations")
