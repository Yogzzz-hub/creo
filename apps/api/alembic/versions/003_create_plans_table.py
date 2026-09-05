"""Create plans table with seed data

Revision ID: 003
Revises: 002
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.dialects.postgresql.ENUM("starter", "growth", "pro", name="plan_name", create_type=False), nullable=False, unique=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("monthly_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("poster_quota", sa.Integer(), nullable=False),
        sa.Column("reel_quota", sa.Integer(), nullable=False),
        sa.Column("story_quota", sa.Integer(), nullable=False),
        sa.Column("revision_rounds", sa.Integer(), nullable=False),
        sa.Column("has_dedicated_manager", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.execute("""
        CREATE TRIGGER update_plans_updated_at
            BEFORE UPDATE ON plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)

    op.execute("""
        INSERT INTO plans (name, display_name, monthly_price, poster_quota, reel_quota, story_quota, revision_rounds, has_dedicated_manager)
        VALUES
            ('starter', 'Starter', 4999.00, 3, 2, 3, 1, false),
            ('growth', 'Growth', 9999.00, 6, 4, 6, 2, false),
            ('pro', 'Pro', 19999.00, 6, 4, 9, 3, true)
    """)


def downgrade() -> None:
    op.execute("DELETE FROM plans")
    op.execute("DROP TRIGGER IF EXISTS update_plans_updated_at ON plans")
    op.drop_table("plans")
