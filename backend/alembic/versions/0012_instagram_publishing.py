"""Add opt-in Instagram connection and publishing lifecycle; no content backfill."""

from alembic import op

revision = "0012_instagram_publishing"
down_revision = "0011_auth_identity_linking"
branch_labels = None
depends_on = None


def upgrade():
    statements = """
        ALTER TABLE client_profiles ADD COLUMN ig_connection_id uuid;
        ALTER TABLE client_profiles ADD COLUMN ig_connection_status varchar(30)
            NOT NULL DEFAULT 'disconnected';
        ALTER TABLE client_profiles ADD COLUMN ig_metadata jsonb NOT NULL DEFAULT '{}';
        CREATE TABLE instagram_oauth (
            id uuid PRIMARY KEY, agency_id uuid NOT NULL REFERENCES agencies(id),
            client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            state_hash varchar(64) NOT NULL UNIQUE, verifier_hash varchar(64) NOT NULL,
            expires_at timestamptz NOT NULL, consumed boolean NOT NULL DEFAULT false,
            candidates_encrypted bytea
        );
        CREATE INDEX ix_instagram_oauth_agency_id ON instagram_oauth(agency_id);
        CREATE INDEX ix_instagram_oauth_client_id ON instagram_oauth(client_id);
        CREATE INDEX ix_instagram_oauth_expires_at ON instagram_oauth(expires_at);
        CREATE TABLE publishing_jobs (
            id uuid PRIMARY KEY, agency_id uuid NOT NULL REFERENCES agencies(id),
            client_id uuid NOT NULL REFERENCES users(id),
            deliverable_id uuid NOT NULL UNIQUE REFERENCES deliverables(id),
            calendar_entry_id uuid REFERENCES content_calendar(id) ON DELETE SET NULL,
            connection_id uuid, instagram_account_id varchar(255),
            status varchar(30) NOT NULL DEFAULT 'pending_approval',
            caption text NOT NULL DEFAULT '',
            media_type varchar(20) NOT NULL DEFAULT 'IMAGE', approved_fingerprint varchar(64),
            approved_by uuid REFERENCES users(id), scheduled_at timestamptz,
            timezone varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
            attempts integer NOT NULL DEFAULT 0,
            next_attempt_at timestamptz, last_attempt_at timestamptz,
            lease_id uuid, lease_until timestamptz,
            stage varchar(30) NOT NULL DEFAULT 'new', container_id varchar(255),
            container_created_at timestamptz, media_id varchar(255), permalink text,
            published_at timestamptz, last_error text, error_code varchar(60), media_metadata jsonb,
            created_by uuid REFERENCES users(id), updated_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT ck_publishing_status CHECK (status IN
              ('pending_approval','needs_schedule','scheduled','processing','published','failed',
               'paused','canceled','uncertain')),
            CONSTRAINT ck_publishing_media CHECK (media_type IN ('IMAGE','REELS','STORIES')),
            CONSTRAINT ck_publishing_schedule CHECK (status != 'scheduled' OR
              (scheduled_at IS NOT NULL AND approved_fingerprint IS NOT NULL
               AND approved_by IS NOT NULL AND approved_by = client_id
               AND connection_id IS NOT NULL
               AND instagram_account_id IS NOT NULL AND media_metadata->>'sha256' IS NOT NULL)),
            CONSTRAINT ck_publishing_confirmed CHECK (status != 'published' OR
              (published_at IS NOT NULL
               AND (media_id IS NOT NULL OR stage = 'confirmed_container')))
        );
        CREATE INDEX ix_publishing_jobs_agency_id ON publishing_jobs(agency_id);
        CREATE INDEX ix_publishing_jobs_client_id ON publishing_jobs(client_id);
        CREATE INDEX ix_publishing_due ON publishing_jobs(status, next_attempt_at, scheduled_at);
    """
    for statement in statements.split(";"):
        if statement.strip():
            op.execute(statement)
    # Tenant RLS is defense in depth; every request also checks account/assignment ownership.
    for table in ("instagram_oauth", "publishing_jobs"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table} USING (
                current_setting('app.is_platform_admin', true) = 'true'
                OR agency_id::text = current_setting('app.current_agency', true)
            ) WITH CHECK (
                current_setting('app.is_platform_admin', true) = 'true'
                OR agency_id::text = current_setting('app.current_agency', true)
            );
        """)
    op.execute("""
        CREATE FUNCTION validate_publishing_owner() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM deliverables d JOIN users u ON u.id=d.client_id
                WHERE d.id=NEW.deliverable_id AND d.client_id=NEW.client_id
                AND u.agency_id=NEW.agency_id
                AND (d.agency_id IS NULL OR d.agency_id=NEW.agency_id))
            THEN RAISE EXCEPTION 'Publishing client/agency mismatch'; END IF;
            IF NEW.calendar_entry_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM content_calendar c WHERE c.id=NEW.calendar_entry_id
                AND c.client_id=NEW.client_id
                AND (c.agency_id IS NULL OR c.agency_id=NEW.agency_id))
            THEN RAISE EXCEPTION 'Publishing calendar mismatch'; END IF;
            RETURN NEW;
        END $$;
    """)
    op.execute("""
        CREATE TRIGGER publishing_owner BEFORE INSERT OR UPDATE ON publishing_jobs
            FOR EACH ROW EXECUTE FUNCTION validate_publishing_owner();
    """)


def downgrade():
    # Disable publishers and export history before explicitly rolling this migration back.
    op.execute("DROP TABLE publishing_jobs")
    op.execute("DROP FUNCTION validate_publishing_owner()")
    op.execute("DROP TABLE instagram_oauth")
    op.execute(
        "ALTER TABLE client_profiles DROP COLUMN ig_metadata, DROP COLUMN ig_connection_status, "
        "DROP COLUMN ig_connection_id;"
    )
