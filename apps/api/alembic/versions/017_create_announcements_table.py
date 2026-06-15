"""Create announcements table

Revision ID: 017
Revises: 016
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "announcements",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("author_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("target_departments", sa.dialects.postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_announcements_author_id", "announcements", ["author_id"])
    op.create_index("ix_announcements_type", "announcements", ["type"])


def downgrade() -> None:
    op.drop_index("ix_announcements_type", table_name="announcements")
    op.drop_index("ix_announcements_author_id", table_name="announcements")
    op.drop_table("announcements")
