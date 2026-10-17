"""Revenue CRM workspace, immutable proposal versions and agency isolation."""
from alembic import op

revision = "0026_revenue_crm"
down_revision = "0025_recurring_billing"
branch_labels = None
depends_on = None

CRM_TABLES = [
    "crm_policies",
    "crm_tasks",
    "crm_services",
    "crm_proposals",
    "crm_referrals",
    "crm_finance_entries",
    "crm_consents",
    "crm_messages",
    "crm_handoffs",
]


def upgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bde'")
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bde_head'")

    # Drop any orphaned composite types left over without a corresponding relation in pg_class
    # to prevent: duplicate key value violates unique constraint "pg_type_typname_nsp_index"
    for table_name in CRM_TABLES:
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = '{table_name}' AND n.nspname = current_schema()
                ) THEN
                    IF EXISTS (
                        SELECT 1 FROM pg_type t
                        JOIN pg_namespace n ON n.oid = t.typnamespace
                        WHERE t.typname = '{table_name}' AND n.nspname = current_schema()
                    ) THEN
                        EXECUTE 'DROP TYPE ' || quote_ident('{table_name}') || ' CASCADE';
                    END IF;
                END IF;
            END $$;
        """)

    op.execute('CREATE TABLE IF NOT EXISTS crm_policies (\n\tagency_id UUID NOT NULL, \n\tbranding JSONB NOT NULL, \n\tsettings JSONB NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (agency_id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('ALTER TABLE crm_policies ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_policies FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_policies')
    op.execute("CREATE POLICY tenant_isolation ON crm_policies USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_tasks (\n\tlead_id UUID NOT NULL, \n\towner_id UUID NOT NULL, \n\tkind VARCHAR(30) NOT NULL, \n\ttitle VARCHAR(255) NOT NULL, \n\tdue_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\toutcome TEXT, \n\tcompleted_at TIMESTAMP WITH TIME ZONE, \n\talerted_at TIMESTAMP WITH TIME ZONE, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(owner_id) REFERENCES users (id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_tasks_lead_id ON crm_tasks (lead_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_tasks_status ON crm_tasks (status)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_tasks_due_at ON crm_tasks (due_at)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_tasks_agency_id ON crm_tasks (agency_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_tasks_owner_id ON crm_tasks (owner_id)')
    op.execute('ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_tasks FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_tasks')
    op.execute("CREATE POLICY tenant_isolation ON crm_tasks USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_services (\n\tsku VARCHAR(60) NOT NULL, \n\ttitle VARCHAR(255) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tunit_price BIGINT NOT NULL, \n\tminimum_price BIGINT NOT NULL, \n\tbilling VARCHAR(20) NOT NULL, \n\tactive BOOLEAN NOT NULL, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_service_sku UNIQUE (agency_id, sku), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_services_agency_id ON crm_services (agency_id)')
    op.execute('ALTER TABLE crm_services ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_services FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_services')
    op.execute("CREATE POLICY tenant_isolation ON crm_services USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_proposals (\n\tlead_id UUID NOT NULL, \n\towner_id UUID NOT NULL, \n\tfamily_id UUID NOT NULL, \n\tnumber VARCHAR(60) NOT NULL, \n\tversion INTEGER NOT NULL, \n\ttitle VARCHAR(255) NOT NULL, \n\tstatus VARCHAR(30) NOT NULL, \n\tcurrency VARCHAR(3) NOT NULL, \n\tsnapshot JSONB NOT NULL, \n\tapproval_required BOOLEAN NOT NULL, \n\tapproved_by UUID, \n\tvalid_until TIMESTAMP WITH TIME ZONE NOT NULL, \n\tsent_at TIMESTAMP WITH TIME ZONE, \n\taccepted_at TIMESTAMP WITH TIME ZONE, \n\tshare_hash VARCHAR(64), \n\trevoked_at TIMESTAMP WITH TIME ZONE, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_proposal_version UNIQUE (agency_id, number, version), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(owner_id) REFERENCES users (id), \n\tFOREIGN KEY(approved_by) REFERENCES users (id), \n\tUNIQUE (share_hash), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_proposals_lead_id ON crm_proposals (lead_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_proposals_agency_id ON crm_proposals (agency_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_proposals_family_id ON crm_proposals (family_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_proposals_status ON crm_proposals (status)')
    op.execute('ALTER TABLE crm_proposals ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_proposals FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_proposals')
    op.execute("CREATE POLICY tenant_isolation ON crm_proposals USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_referrals (\n\tlead_id UUID NOT NULL, \n\tacquired_by UUID NOT NULL, \n\treferrer VARCHAR(255) NOT NULL, \n\tsource VARCHAR(100) NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tacquired_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tnotes TEXT NOT NULL, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_referral_lead UNIQUE (agency_id, lead_id), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(acquired_by) REFERENCES users (id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_referrals_acquired_by ON crm_referrals (acquired_by)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_referrals_agency_id ON crm_referrals (agency_id)')
    op.execute('ALTER TABLE crm_referrals ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_referrals FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_referrals')
    op.execute("CREATE POLICY tenant_isolation ON crm_referrals USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_finance_entries (\n\tlead_id UUID NOT NULL, \n\trecorded_by UUID NOT NULL, \n\tkind VARCHAR(20) NOT NULL, \n\tamount BIGINT NOT NULL, \n\tcurrency VARCHAR(3) NOT NULL, \n\treference VARCHAR(100) NOT NULL, \n\toccurred_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_finance_reference UNIQUE (agency_id, kind, reference), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(recorded_by) REFERENCES users (id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_finance_entries_lead_id ON crm_finance_entries (lead_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_finance_entries_agency_id ON crm_finance_entries (agency_id)')
    op.execute('ALTER TABLE crm_finance_entries ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_finance_entries FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_finance_entries')
    op.execute("CREATE POLICY tenant_isolation ON crm_finance_entries USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_consents (\n\tlead_id UUID NOT NULL, \n\tactor_id UUID NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tevidence TEXT NOT NULL, \n\tpurpose VARCHAR(255) NOT NULL, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(actor_id) REFERENCES users (id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_consents_agency_id ON crm_consents (agency_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_consents_lead_id ON crm_consents (lead_id)')
    op.execute('ALTER TABLE crm_consents ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_consents FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_consents')
    op.execute("CREATE POLICY tenant_isolation ON crm_consents USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_messages (\n\tlead_id UUID NOT NULL, \n\tactor_id UUID NOT NULL, \n\tbody TEXT NOT NULL, \n\tstatus VARCHAR(30) NOT NULL, \n\tdirection VARCHAR(10) NOT NULL, \n\tprovider_id VARCHAR(255), \n\tidempotency_key VARCHAR(100) NOT NULL, \n\terror TEXT, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_message_key UNIQUE (agency_id, idempotency_key), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(actor_id) REFERENCES users (id), \n\tUNIQUE (provider_id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_messages_agency_id ON crm_messages (agency_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_messages_lead_id ON crm_messages (lead_id)')
    op.execute('ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_messages FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_messages')
    op.execute("CREATE POLICY tenant_isolation ON crm_messages USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute('CREATE TABLE IF NOT EXISTS crm_handoffs (\n\tlead_id UUID NOT NULL, \n\tproposal_id UUID NOT NULL, \n\towner_id UUID NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tsnapshot JSONB NOT NULL, \n\tagency_id UUID NOT NULL, \n\tid UUID DEFAULT gen_random_uuid() NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_crm_handoff_lead UNIQUE (agency_id, lead_id), \n\tFOREIGN KEY(lead_id) REFERENCES bde_leads (id), \n\tFOREIGN KEY(proposal_id) REFERENCES crm_proposals (id), \n\tFOREIGN KEY(owner_id) REFERENCES users (id), \n\tFOREIGN KEY(agency_id) REFERENCES agencies (id)\n)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_crm_handoffs_agency_id ON crm_handoffs (agency_id)')
    op.execute('ALTER TABLE crm_handoffs ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE crm_handoffs FORCE ROW LEVEL SECURITY')
    op.execute('DROP POLICY IF EXISTS tenant_isolation ON crm_handoffs')
    op.execute("CREATE POLICY tenant_isolation ON crm_handoffs USING (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true)) WITH CHECK (current_setting('app.is_platform_admin',true)='true' OR agency_id::text=current_setting('app.current_agency',true))")

    op.execute("ALTER TABLE crm_proposals ADD COLUMN IF NOT EXISTS pdf_content bytea")
    op.execute("ALTER TABLE crm_messages ADD COLUMN IF NOT EXISTS scheduled_at timestamptz, ADD COLUMN IF NOT EXISTS metadata_extra jsonb NOT NULL DEFAULT '{}'")
    op.execute("CREATE INDEX IF NOT EXISTS ix_crm_message_scheduled ON crm_messages(status,scheduled_at)")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_crm_lead_agency'
            ) THEN
                ALTER TABLE bde_leads ADD CONSTRAINT uq_crm_lead_agency UNIQUE (agency_id, id);
            END IF;
        END $$;
    """)

    for table in ["crm_tasks", "crm_proposals", "crm_referrals", "crm_finance_entries", "crm_consents", "crm_messages", "crm_handoffs"]:
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_{table}_lead_agency'
                ) THEN
                    ALTER TABLE {table} ADD CONSTRAINT fk_{table}_lead_agency FOREIGN KEY (agency_id, lead_id) REFERENCES bde_leads(agency_id, id);
                END IF;
            END $$;
        """)

    op.execute("""INSERT INTO crm_tasks (id,agency_id,lead_id,owner_id,kind,title,due_at,status,created_at,updated_at)
        SELECT gen_random_uuid(),l.agency_id,l.id,l.assigned_bde_id,'call','Follow up with ' || left(l.company_name,230),l.next_follow_up_at,'pending',now(),now()
        FROM bde_leads l JOIN users u ON u.id=l.assigned_bde_id AND u.agency_id=l.agency_id
        WHERE l.agency_id IS NOT NULL AND l.next_follow_up_at IS NOT NULL AND l.status NOT IN ('converted','lost','disqualified','archived')
        ON CONFLICT DO NOTHING""")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_tasks_status') THEN
                ALTER TABLE crm_tasks ADD CONSTRAINT chk_crm_tasks_status CHECK (status IN ('pending','completed','canceled'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_tasks_kind') THEN
                ALTER TABLE crm_tasks ADD CONSTRAINT chk_crm_tasks_kind CHECK (kind IN ('call','message','meeting','research','proposal','referral'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_services_price') THEN
                ALTER TABLE crm_services ADD CONSTRAINT chk_crm_services_price CHECK (unit_price >= 0 AND minimum_price >= 0 AND minimum_price <= unit_price);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_proposals_version') THEN
                ALTER TABLE crm_proposals ADD CONSTRAINT chk_crm_proposals_version CHECK (version > 0);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_proposals_status') THEN
                ALTER TABLE crm_proposals ADD CONSTRAINT chk_crm_proposals_status CHECK (status IN ('draft','review','approved','sent','viewed','accepted','declined','revision_requested'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_finance_amount') THEN
                ALTER TABLE crm_finance_entries ADD CONSTRAINT chk_crm_finance_amount CHECK (amount > 0);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_finance_kind') THEN
                ALTER TABLE crm_finance_entries ADD CONSTRAINT chk_crm_finance_kind CHECK (kind IN ('invoice','receipt'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_consents_status') THEN
                ALTER TABLE crm_consents ADD CONSTRAINT chk_crm_consents_status CHECK (status IN ('opted_in','opted_out','unknown'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_referrals_status') THEN
                ALTER TABLE crm_referrals ADD CONSTRAINT chk_crm_referrals_status CHECK (status IN ('submitted','verified','qualified','converted','rejected'));
            END IF;
        END $$;
    """)

    op.execute("CREATE OR REPLACE FUNCTION crm_protect_proposal_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN\n IF OLD.status IN ('sent','viewed','accepted','declined','revision_requested') AND\n   (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.pdf_content IS DISTINCT FROM OLD.pdf_content OR NEW.lead_id IS DISTINCT FROM OLD.lead_id OR\n    NEW.version IS DISTINCT FROM OLD.version OR NEW.currency IS DISTINCT FROM OLD.currency OR\n    NEW.title IS DISTINCT FROM OLD.title OR NEW.valid_until IS DISTINCT FROM OLD.valid_until OR\n    NEW.family_id IS DISTINCT FROM OLD.family_id OR NEW.number IS DISTINCT FROM OLD.number) THEN\n  RAISE EXCEPTION 'Issued proposal snapshots are immutable; create a new version';\n END IF;\n RETURN NEW;\nEND $$")
    op.execute('DROP TRIGGER IF EXISTS crm_proposal_snapshot_guard ON crm_proposals')
    op.execute('CREATE TRIGGER crm_proposal_snapshot_guard BEFORE UPDATE ON crm_proposals FOR EACH ROW EXECUTE FUNCTION crm_protect_proposal_snapshot()')

    op.execute("CREATE OR REPLACE FUNCTION crm_protect_referral_attribution() RETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN\n IF NEW.acquired_by IS DISTINCT FROM OLD.acquired_by OR NEW.acquired_at IS DISTINCT FROM OLD.acquired_at OR NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN\n  RAISE EXCEPTION 'Original referral attribution is immutable';\n END IF;\n RETURN NEW;\nEND $$")
    op.execute('DROP TRIGGER IF EXISTS crm_referral_attribution_guard ON crm_referrals')
    op.execute('CREATE TRIGGER crm_referral_attribution_guard BEFORE UPDATE ON crm_referrals FOR EACH ROW EXECUTE FUNCTION crm_protect_referral_attribution()')


def downgrade():
    op.drop_table("crm_handoffs")
    op.drop_table("crm_messages")
    op.drop_table("crm_consents")
    op.drop_table("crm_finance_entries")
    op.drop_table("crm_referrals")
    op.drop_table("crm_proposals")
    op.drop_table("crm_services")
    op.drop_table("crm_tasks")
    op.drop_table("crm_policies")
    op.execute("DROP FUNCTION IF EXISTS crm_protect_proposal_snapshot()")
    op.execute("DROP FUNCTION IF EXISTS crm_protect_referral_attribution()")
    op.execute("ALTER TABLE bde_leads DROP CONSTRAINT IF EXISTS uq_crm_lead_agency")

