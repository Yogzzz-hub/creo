"""Create content_plans table

Revision ID: 008
Revises: 007
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_plans",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "draft", "submitted", "approved", "rejected",
            name="content_plan_status", create_type=False
        ), nullable=False, server_default="draft"),
        sa.Column("pdf_url", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_content_plans_client_id", "content_plans", ["client_id"])
    op.create_index("ix_content_plans_month_year", "content_plans", ["month", "year"])

    op.execute("""
        CREATE TRIGGER update_content_plans_updated_at
            BEFORE UPDATE ON content_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_content_plans_updated_at ON content_plans")
    op.drop_index("ix_content_plans_month_year", table_name="content_plans")
    op.drop_index("ix_content_plans_client_id", table_name="content_plans")
    op.drop_table("content_plans")
