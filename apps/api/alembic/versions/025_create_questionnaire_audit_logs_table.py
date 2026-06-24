"""Create questionnaire_audit_logs table

Revision ID: 025
Revises: 024
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "questionnaire_audit_logs",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "questionnaire_id",
            sa.UUID(),
            sa.ForeignKey("questionnaires.id"),
            nullable=False,
        ),
        sa.Column(
            "changed_by_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("change_source", sa.Text(), nullable=False),
        sa.Column("old_ai_analysis", JSONB(), nullable=True),
        sa.Column("new_ai_analysis", JSONB(), nullable=True),
        sa.Column("old_summary_line", sa.Text(), nullable=True),
        sa.Column("new_summary_line", sa.Text(), nullable=True),
        sa.Column(
            "changed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_questionnaire_audit_logs_questionnaire_id",
        "questionnaire_audit_logs",
        ["questionnaire_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_questionnaire_audit_logs_questionnaire_id",
        table_name="questionnaire_audit_logs",
    )
    op.drop_table("questionnaire_audit_logs")
