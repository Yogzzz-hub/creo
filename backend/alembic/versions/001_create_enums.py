"""Create all PostgreSQL enum types

Revision ID: 001
Revises:
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE user_role AS ENUM (
            'client',
            'team_member',
            'team_lead',
            'sales',
            'admin',
            'investor_relations',
            'super_admin'
        )
    """)

    op.execute("""
        CREATE TYPE account_status AS ENUM (
            'pending_verification',
            'pending_payment',
            'active',
            'lapsed',
            'suspended',
            'deleted'
        )
    """)

    op.execute("""
        CREATE TYPE plan_name AS ENUM (
            'starter',
            'growth',
            'pro'
        )
    """)

    op.execute("""
        CREATE TYPE deliverable_type AS ENUM (
            'poster',
            'reel',
            'story'
        )
    """)

    op.execute("""
        CREATE TYPE deliverable_status AS ENUM (
            'pending_approval',
            'approved',
            'rejected',
            'revision_in_progress',
            'revised_pending_approval'
        )
    """)

    op.execute("""
        CREATE TYPE task_status AS ENUM (
            'pending',
            'in_progress',
            'submitted',
            'approved',
            'revision',
            'overdue'
        )
    """)

    op.execute("""
        CREATE TYPE ticket_type AS ENUM (
            'deliverable_revision',
            'general_support',
            'billing_issue',
            'content_brief_update'
        )
    """)

    op.execute("""
        CREATE TYPE ticket_status AS ENUM (
            'open',
            'in_progress',
            'awaiting_client',
            'resolved',
            'escalated'
        )
    """)

    op.execute("""
        CREATE TYPE department AS ENUM (
            'graphics',
            'video',
            'content_writing',
            'social_media',
            'sales',
            'investor_relations',
            'admin',
            'tech'
        )
    """)

    op.execute("""
        CREATE TYPE payment_gateway AS ENUM (
            'razorpay',
            'stripe'
        )
    """)

    op.execute("""
        CREATE TYPE content_plan_status AS ENUM (
            'draft',
            'submitted',
            'approved',
            'rejected'
        )
    """)

    op.execute("""
        CREATE TYPE calendar_entry_status AS ENUM (
            'draft',
            'scheduled',
            'in_progress',
            'ready_for_review',
            'approved',
            'rejected'
        )
    """)

    op.execute("""
        CREATE TYPE leave_status AS ENUM (
            'pending',
            'approved',
            'rejected'
        )
    """)

    op.execute("""
        CREATE TYPE custom_pricing_status AS ENUM (
            'pending',
            'approved',
            'rejected'
        )
    """)

    op.execute("""
        CREATE TYPE addon_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'completed'
        )
    """)


def downgrade() -> None:
    op.execute("DROP TYPE IF EXISTS addon_status")
    op.execute("DROP TYPE IF EXISTS custom_pricing_status")
    op.execute("DROP TYPE IF EXISTS leave_status")
    op.execute("DROP TYPE IF EXISTS calendar_entry_status")
    op.execute("DROP TYPE IF EXISTS content_plan_status")
    op.execute("DROP TYPE IF EXISTS payment_gateway")
    op.execute("DROP TYPE IF EXISTS department")
    op.execute("DROP TYPE IF EXISTS ticket_status")
    op.execute("DROP TYPE IF EXISTS ticket_type")
    op.execute("DROP TYPE IF EXISTS task_status")
    op.execute("DROP TYPE IF EXISTS deliverable_status")
    op.execute("DROP TYPE IF EXISTS deliverable_type")
    op.execute("DROP TYPE IF EXISTS plan_name")
    op.execute("DROP TYPE IF EXISTS account_status")
    op.execute("DROP TYPE IF EXISTS user_role")
