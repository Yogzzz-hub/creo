"""Let offline payment requests be cancelled and keep negotiation columns in the schema.

Revoking an admin payment bypass marks the client's manual payment requests CANCELLED,
which the original CHECK constraint rejected, so every revoke failed with a database error.
The negotiation workflow also stores richer statuses ("Pending Review", "Accepted",
"Counter Offered", "Declined") than any legacy CHECK on plan_negotiations allows, and
needs the quota/price columns that were previously only added by application start-up.

Revision ID: 0015_payment_state_constraints
Revises: 0014_manual_payment_requests
"""

from alembic import op

revision = "0015_payment_state_constraints"
down_revision = "0014_manual_payment_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE manual_payment_requests DROP CONSTRAINT IF EXISTS manual_payment_requests_status_check")
    op.execute(
        "ALTER TABLE manual_payment_requests ADD CONSTRAINT manual_payment_requests_status_check "
        "CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))"
    )

    # A database first created by start-up code may carry a three-value status CHECK.
    op.execute("ALTER TABLE plan_negotiations DROP CONSTRAINT IF EXISTS plan_negotiations_status_check")
    for column in (
        "agreed_amount bigint",
        "reel_quota integer DEFAULT 8",
        "poster_quota integer DEFAULT 12",
        "story_quota integer DEFAULT 15",
        "order_id varchar(255)",
        "razorpay_custom_plan_id varchar(255)",
    ):
        op.execute(f"ALTER TABLE plan_negotiations ADD COLUMN IF NOT EXISTS {column}")


def downgrade() -> None:
    op.execute("UPDATE manual_payment_requests SET status = 'REJECTED' WHERE status = 'CANCELLED'")
    op.execute("ALTER TABLE manual_payment_requests DROP CONSTRAINT IF EXISTS manual_payment_requests_status_check")
    op.execute(
        "ALTER TABLE manual_payment_requests ADD CONSTRAINT manual_payment_requests_status_check "
        "CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))"
    )
