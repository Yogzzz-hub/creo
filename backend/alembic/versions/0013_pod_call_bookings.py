"""Persist client pod-call bookings and prevent lead slot collisions."""

from alembic import op

revision = "0013_pod_call_bookings"
down_revision = "0012_instagram_publishing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE pod_call_bookings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
            client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lead_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            starts_at timestamptz NOT NULL,
            duration_minutes integer NOT NULL DEFAULT 15 CHECK (duration_minutes = 15),
            status varchar(20) NOT NULL DEFAULT 'booked',
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_pod_call_lead_slot UNIQUE (lead_id, starts_at)
        )
    """)
    op.create_index("ix_pod_call_client_starts_at", "pod_call_bookings", ["client_id", "starts_at"])
    op.create_index("ix_pod_call_lead_starts_at", "pod_call_bookings", ["lead_id", "starts_at"])
    op.execute("ALTER TABLE pod_call_bookings ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE pod_call_bookings FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON pod_call_bookings USING (
            current_setting('app.is_platform_admin', true) = 'true'
            OR agency_id::text = current_setting('app.current_agency', true)
        ) WITH CHECK (
            current_setting('app.is_platform_admin', true) = 'true'
            OR agency_id::text = current_setting('app.current_agency', true)
        )
    """)


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON pod_call_bookings")
    op.drop_index("ix_pod_call_lead_starts_at", table_name="pod_call_bookings")
    op.drop_index("ix_pod_call_client_starts_at", table_name="pod_call_bookings")
    op.drop_table("pod_call_bookings")
