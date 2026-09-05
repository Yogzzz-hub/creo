"""Create team_members table

Revision ID: 006
Revises: 005
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "team_members",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("department", sa.dialects.postgresql.ENUM(
            "graphics", "video", "content_writing", "social_media",
            "sales", "investor_relations", "admin", "tech",
            name="department", create_type=False
        ), nullable=False),
        sa.Column("daily_cap_posters", sa.Integer(), nullable=False, server_default=sa.text("6")),
        sa.Column("daily_cap_reels", sa.Integer(), nullable=False, server_default=sa.text("4")),
        sa.Column("daily_cap_stories", sa.Integer(), nullable=False, server_default=sa.text("3")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("joined_at", sa.Date(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_team_members_user_id", "team_members", ["user_id"])
    op.create_index("ix_team_members_department", "team_members", ["department"])
    op.create_index("ix_team_members_is_active", "team_members", ["is_active"])

    op.execute("""
        CREATE TRIGGER update_team_members_updated_at
            BEFORE UPDATE ON team_members
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members")
    op.drop_index("ix_team_members_is_active", table_name="team_members")
    op.drop_index("ix_team_members_department", table_name="team_members")
    op.drop_index("ix_team_members_user_id", table_name="team_members")
    op.drop_table("team_members")
