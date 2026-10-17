from alembic import op

revision = "0025_recurring_billing"
down_revision = "0024_test_post_schedule"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TABLE subscriptions ADD COLUMN gateway_data jsonb NOT NULL DEFAULT '{}'")
    op.execute("""CREATE TABLE subscription_pause_requests (
        id uuid PRIMARY KEY, agency_id uuid NOT NULL REFERENCES agencies(id),
        client_id uuid NOT NULL REFERENCES users(id), subscription_id uuid NOT NULL REFERENCES subscriptions(id),
        status varchar(30) NOT NULL DEFAULT 'pending', reason text NOT NULL,
        effective_at timestamptz NOT NULL, reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK (status IN ('pending','approved','rejected','withdrawn'))
    )""")
    op.execute("CREATE UNIQUE INDEX uq_pending_subscription_pause ON subscription_pause_requests(subscription_id) WHERE status='pending'")
    op.execute("CREATE INDEX ix_billing_pause_agency ON subscription_pause_requests(agency_id, created_at)")
    op.execute("CREATE INDEX ix_billing_pause_client ON subscription_pause_requests(client_id, created_at)")
    op.execute("ALTER TABLE subscription_pause_requests ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE subscription_pause_requests FORCE ROW LEVEL SECURITY")
    op.execute("""CREATE POLICY tenant_isolation ON subscription_pause_requests USING (
        current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)
    ) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))""")

def downgrade():
    op.drop_table("subscription_pause_requests")
    op.execute("ALTER TABLE subscriptions DROP COLUMN gateway_data")
