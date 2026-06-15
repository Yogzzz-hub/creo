"""Create questionnaires table

Revision ID: 005
Revises: 004
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "questionnaires",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("industry", sa.Text(), nullable=False),
        sa.Column("business_description", sa.Text(), nullable=False),
        sa.Column("target_audience", JSONB(), nullable=False),
        sa.Column("social_handles", JSONB(), nullable=False),
        sa.Column("current_posting_frequency", sa.Text(), nullable=True),
        sa.Column("content_what_works", sa.Text(), nullable=True),
        sa.Column("content_what_doesnt", sa.Text(), nullable=True),
        sa.Column("primary_goal", sa.Text(), nullable=False),
        sa.Column("brand_tone", sa.dialects.postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("competitor_refs", sa.dialects.postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("topics_to_avoid", sa.Text(), nullable=True),
        sa.Column("style_references", sa.dialects.postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("ai_analysis", JSONB(), nullable=True),
        sa.Column("ai_summary_line", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_questionnaires_user_id", "questionnaires", ["user_id"])

    op.execute("""
        CREATE TRIGGER update_questionnaires_updated_at
            BEFORE UPDATE ON questionnaires
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_questionnaires_updated_at ON questionnaires")
    op.drop_index("ix_questionnaires_user_id", table_name="questionnaires")
    op.drop_table("questionnaires")
