"""Create leave_requests table

Revision ID: 015
Revises: 014
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leave_requests",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_member_id", sa.UUID(), sa.ForeignKey("team_members.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "pending", "approved", "rejected",
            name="leave_status", create_type=False
        ), nullable=False, server_default="pending"),
        sa.Column("approved_by", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_leave_requests_team_member_id", "leave_requests", ["team_member_id"])
    op.create_index("ix_leave_requests_status", "leave_requests", ["status"])

    op.execute("""
        CREATE TRIGGER update_leave_requests_updated_at
            BEFORE UPDATE ON leave_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests")
    op.drop_index("ix_leave_requests_status", table_name="leave_requests")
    op.drop_index("ix_leave_requests_team_member_id", table_name="leave_requests")
    op.drop_table("leave_requests")
