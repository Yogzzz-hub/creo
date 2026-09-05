"""Create users table

Revision ID: 002
Revises: 001
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("auth_id", sa.UUID(), nullable=False, unique=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("phone", sa.Text(), nullable=True, unique=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("business_name", sa.Text(), nullable=True),
        sa.Column("role", sa.dialects.postgresql.ENUM("client", "team_member", "team_lead", "sales", "admin", "investor_relations", "super_admin", name="user_role", create_type=False), nullable=False, server_default="client"),
        sa.Column("account_status", sa.dialects.postgresql.ENUM("pending_verification", "pending_payment", "active", "lapsed", "suspended", "deleted", name="account_status", create_type=False), nullable=False, server_default="pending_verification"),
        sa.Column("plan_name", sa.dialects.postgresql.ENUM("starter", "growth", "pro", name="plan_name", create_type=False), nullable=True),
        sa.Column("instagram_access_token", sa.Text(), nullable=True),
        sa.Column("instagram_user_id", sa.Text(), nullable=True),
        sa.Column("razorpay_customer_id", sa.Text(), nullable=True),
        sa.Column("stripe_customer_id", sa.Text(), nullable=True),
        sa.Column("two_fa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
    """)

    op.execute("""
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_users_updated_at ON users")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.drop_table("users")
