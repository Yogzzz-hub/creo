"""Create custom_pricing table

Revision ID: 018
Revises: 017
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_pricing",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("custom_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("approved_by", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "pending", "approved", "rejected",
            name="custom_pricing_status", create_type=False
        ), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_custom_pricing_user_id", "custom_pricing", ["user_id"])
    op.create_index("ix_custom_pricing_status", "custom_pricing", ["status"])

    op.execute("""
        CREATE TRIGGER update_custom_pricing_updated_at
            BEFORE UPDATE ON custom_pricing
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_custom_pricing_updated_at ON custom_pricing")
    op.drop_index("ix_custom_pricing_status", table_name="custom_pricing")
    op.drop_index("ix_custom_pricing_user_id", table_name="custom_pricing")
    op.drop_table("custom_pricing")
