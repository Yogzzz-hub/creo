"""Add file_url, file_name, and updated_at to announcements

Revision ID: 034
Revises: f6a7b8c9
Create Date: 2026-07-01

"""
from alembic import op
import sqlalchemy as sa


revision = "034"
down_revision = "f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("announcements", sa.Column("file_url", sa.Text(), nullable=True))
    op.add_column("announcements", sa.Column("file_name", sa.Text(), nullable=True))
    op.add_column(
        "announcements",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("announcements", "updated_at")
    op.drop_column("announcements", "file_name")
    op.drop_column("announcements", "file_url")
