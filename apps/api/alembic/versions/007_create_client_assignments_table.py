"""Create client_assignments table

Revision ID: 007
Revises: 006
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "client_assignments",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_member_id", sa.UUID(), sa.ForeignKey("team_members.id"), nullable=False),
        sa.Column("deliverable_type", sa.dialects.postgresql.ENUM(
            "poster", "reel", "story",
            name="deliverable_type", create_type=False
        ), nullable=False),
        sa.Column("assigned_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("assigned_by", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_client_assignments_client_id", "client_assignments", ["client_id"])
    op.create_index("ix_client_assignments_team_member_id", "client_assignments", ["team_member_id"])
    op.create_index("ix_client_assignments_is_active", "client_assignments", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_client_assignments_is_active", table_name="client_assignments")
    op.drop_index("ix_client_assignments_team_member_id", table_name="client_assignments")
    op.drop_index("ix_client_assignments_client_id", table_name="client_assignments")
    op.drop_table("client_assignments")
