"""Temporary, isolated Instagram sample-post attempts."""
from alembic import op

revision = "0023_instagram_test_posts"
down_revision = "0022_voice_columns"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE instagram_test_posts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id uuid NOT NULL REFERENCES agencies(id),
            client_id uuid NOT NULL REFERENCES users(id),
            actor_id uuid NOT NULL REFERENCES users(id),
            connection_id uuid NOT NULL, account_id varchar(255) NOT NULL,
            status varchar(30) NOT NULL DEFAULT 'queued',
            container_id varchar(255), media_id varchar(255), permalink text, error text,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT ck_test_post_status CHECK (status IN
                ('queued', 'processing', 'submitting', 'published', 'failed', 'uncertain'))
        )
    """)
    op.execute("CREATE INDEX ix_test_post_client ON instagram_test_posts(client_id, created_at)")
    op.execute("ALTER TABLE instagram_test_posts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE instagram_test_posts FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON instagram_test_posts USING (
            current_setting('app.is_platform_admin', true) = 'true'
            OR agency_id::text = current_setting('app.current_agency', true)
        ) WITH CHECK (
            current_setting('app.is_platform_admin', true) = 'true'
            OR agency_id::text = current_setting('app.current_agency', true)
        )
    """)


def downgrade():
    op.drop_table("instagram_test_posts")
