"""Add BDE leads and activities tables for CRM and follow-up automation.

Revision ID: 0017_bde_leads_and_activities
Revises: 0016_merge_legacy_enhancements
Create Date: 2026-10-14 14:15:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0017_bde_leads_and_activities"
down_revision = "0016_merge_legacy_enhancements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create bde_leads table
    op.create_table(
        "bde_leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("agency_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agencies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("assigned_bde_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("estimated_deal_value", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("lead_source", sa.String(100), server_default="Inbound Website", nullable=False),
        sa.Column("priority", sa.String(20), server_default="warm", nullable=False),
        sa.Column("status", sa.String(50), server_default="new", nullable=False),
        sa.Column("lost_reason", sa.Text(), nullable=True),
        sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_extra", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bde_leads_agency_id", "bde_leads", ["agency_id"])
    op.create_index("ix_bde_leads_assigned_bde_id", "bde_leads", ["assigned_bde_id"])
    op.create_index("ix_bde_leads_company_name", "bde_leads", ["company_name"])
    op.create_index("ix_bde_leads_priority", "bde_leads", ["priority"])
    op.create_index("ix_bde_leads_status", "bde_leads", ["status"])
    op.create_index("ix_bde_leads_next_follow_up_at", "bde_leads", ["next_follow_up_at"])

    # 2. Create bde_lead_activities table
    op.create_table(
        "bde_lead_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bde_leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bde_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("activity_type", sa.String(50), server_default="note", nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("outcome", sa.String(255), nullable=True),
        sa.Column("scheduled_follow_up", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_extra", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bde_lead_activities_lead_id", "bde_lead_activities", ["lead_id"])


def downgrade() -> None:
    op.drop_table("bde_lead_activities")
    op.drop_table("bde_leads")
