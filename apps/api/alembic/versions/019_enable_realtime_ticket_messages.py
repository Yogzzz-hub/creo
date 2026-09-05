"""Enable Supabase Realtime on ticket_messages

Revision ID: 019
Revises: 018
Create Date: 2026-06-15

"""
from alembic import op
import sqlalchemy as sa


revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
            ) THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
            ) THEN
                ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS ticket_messages;
            END IF;
        END
        $$;
    """)
