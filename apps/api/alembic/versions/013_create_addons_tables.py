"""Create addons and addon_pricing tables, seed addon_pricing, fix tasks.addon_id FK

Revision ID: 013
Revises: 012
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "addon_pricing",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deliverable_type", sa.dialects.postgresql.ENUM(
            "poster", "reel", "story",
            name="deliverable_type", create_type=False
        ), nullable=False, unique=True),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.execute("""
        CREATE TRIGGER update_addon_pricing_updated_at
            BEFORE UPDATE ON addon_pricing
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)

    op.execute("""
        INSERT INTO addon_pricing (deliverable_type, unit_price)
        VALUES
            ('poster', 999.00),
            ('reel', 1999.00),
            ('story', 799.00)
    """)

    op.create_table(
        "addons",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deliverable_type", sa.dialects.postgresql.ENUM(
            "poster", "reel", "story",
            name="deliverable_type", create_type=False
        ), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "pending", "approved", "rejected", "completed",
            name="addon_status", create_type=False
        ), nullable=False, server_default="pending"),
        sa.Column("gateway", sa.dialects.postgresql.ENUM(
            "razorpay", "stripe",
            name="payment_gateway", create_type=False
        ), nullable=True),
        sa.Column("payment_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_addons_user_id", "addons", ["user_id"])
    op.create_index("ix_addons_status", "addons", ["status"])

    op.execute("""
        ALTER TABLE tasks
            ADD CONSTRAINT fk_tasks_addon
            FOREIGN KEY (addon_id) REFERENCES addons(id)
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_addon")
    op.drop_index("ix_addons_status", table_name="addons")
    op.drop_index("ix_addons_user_id", table_name="addons")
    op.drop_table("addons")
    op.execute("DELETE FROM addon_pricing")
    op.execute("DROP TRIGGER IF EXISTS update_addon_pricing_updated_at ON addon_pricing")
    op.drop_table("addon_pricing")
