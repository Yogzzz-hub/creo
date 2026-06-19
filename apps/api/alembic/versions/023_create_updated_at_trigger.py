"""create_updated_at_trigger

Revision ID: 023
Revises: 022
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa


revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None

TRIGGER_TABLES = [
    "users",
    "plans",
    "subscriptions",
    "questionnaires",
    "team_members",
    "content_plans",
    "content_calendar",
    "tasks",
    "deliverables",
    "tickets",
    "addons",
    "leave_requests",
    "escalations",
    "custom_pricing",
    "addon_pricing",
]


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION update_modified_column()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;
    """)

    for table in TRIGGER_TABLES:
        op.execute(f"""
            DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table};
            CREATE TRIGGER update_{table}_updated_at
                BEFORE UPDATE ON {table}
                FOR EACH ROW
                EXECUTE FUNCTION update_modified_column();
        """)


def downgrade() -> None:
    for table in TRIGGER_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table};")

    op.execute("DROP FUNCTION IF EXISTS update_modified_column();")
