"""0007_brand_questionnaire_and_dna

Adds structured sections A-G and completion timestamps to questionnaires.
Adds brand_dna_version and brand_dna_source to client_profiles.
Updates v_client_onboarding view to advance stage when core_completed_at is set.

Revision ID: 0007_brand_questionnaire_and_dna
Revises: 0006_content_calendar_engine
Create Date: 2026-09-13 15:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_brand_questionnaire_and_dna"
down_revision: str | None = "0006_content_calendar_engine"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Update questionnaires table
    op.add_column(
        "questionnaires",
        sa.Column("section_a", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_b", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_c", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_d", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_e", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_f", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("section_g", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column(
        "questionnaires",
        sa.Column("core_completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "questionnaires",
        sa.Column("extended_completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "questionnaires",
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )

    # 2. Update client_profiles table
    op.add_column(
        "client_profiles",
        sa.Column("brand_dna_version", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )
    op.add_column(
        "client_profiles",
        sa.Column("brand_dna_source", sa.String(length=20), nullable=False, server_default=sa.text("'template'")),
    )

    # 3. Update v_client_onboarding view
    op.execute("""
        CREATE OR REPLACE VIEW v_client_onboarding AS
        SELECT
            u.id AS client_id,
            CASE
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') AND (cp.onboarding_completed_at IS NOT NULL OR q.core_completed_at IS NOT NULL) THEN 4
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') THEN 3
                WHEN cp.terms_accepted_at IS NOT NULL THEN 2
                WHEN (
                    u.email_verified_at IS NOT NULL
                    OR u.account_status != 'pending_verification'
                ) THEN 1
                ELSE 0
            END AS stage
        FROM users u
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN questionnaires q ON q.user_id = u.id
        LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
        WHERE u.role = 'client';
    """)


def downgrade() -> None:
    # Revert v_client_onboarding view
    op.execute("""
        CREATE OR REPLACE VIEW v_client_onboarding AS
        SELECT
            u.id AS client_id,
            CASE
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') AND cp.onboarding_completed_at IS NOT NULL THEN 4
                WHEN s.id IS NOT NULL AND s.status IN ('trialing', 'active') THEN 3
                WHEN cp.terms_accepted_at IS NOT NULL THEN 2
                WHEN (
                    u.email_verified_at IS NOT NULL
                    OR u.account_status != 'pending_verification'
                ) THEN 1
                ELSE 0
            END AS stage
        FROM users u
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
        WHERE u.role = 'client';
    """)

    op.drop_column("client_profiles", "brand_dna_source")
    op.drop_column("client_profiles", "brand_dna_version")

    op.drop_column("questionnaires", "version")
    op.drop_column("questionnaires", "extended_completed_at")
    op.drop_column("questionnaires", "core_completed_at")
    op.drop_column("questionnaires", "section_g")
    op.drop_column("questionnaires", "section_f")
    op.drop_column("questionnaires", "section_e")
    op.drop_column("questionnaires", "section_d")
    op.drop_column("questionnaires", "section_c")
    op.drop_column("questionnaires", "section_b")
    op.drop_column("questionnaires", "section_a")
