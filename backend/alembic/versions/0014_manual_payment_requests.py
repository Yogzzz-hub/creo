"""Persist offline payment verification requests.

Revision ID: 0014_manual_payment_requests
Revises: 0013_pod_call_bookings
Create Date: 2026-10-12 19:30:00.000000
"""

from alembic import op

revision = "0014_manual_payment_requests"
down_revision = "0013_pod_call_bookings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS manual_payment_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
            amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            reference_note TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
            reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP WITH TIME ZONE,
            admin_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_manual_payments_client_id ON manual_payment_requests(client_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payment_requests(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at ON manual_payment_requests(created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS manual_payment_requests")
