"""Merge the legacy deployment marker and canonical payment migrations.

Both database histories retain their existing schema and converge on one head.
This is a metadata merge, not a stamp or a recreation of the missing legacy DDL.
"""

from alembic import op

revision = "0016_merge_legacy_enhancements"
down_revision = ("0015_payment_state_constraints", "0014_enhancements")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fail transactionally if a different database carries the legacy marker but
    # lacks its assumed prerequisites. Do not silently mark an incomplete schema
    # as current. Extra legacy tables/columns are intentionally left untouched.
    op.execute("""
        DO $$
        DECLARE missing_columns text;
        BEGIN
            SELECT string_agg(required.table_name || '.' || required.column_name, ', ')
            INTO missing_columns
            FROM (VALUES
                ('users', 'google_sub'),
                ('users', 'token_version'),
                ('client_profiles', 'ig_connection_id'),
                ('client_profiles', 'ig_connection_status'),
                ('client_profiles', 'ig_metadata'),
                ('instagram_oauth', 'state_hash'),
                ('instagram_oauth', 'verifier_hash'),
                ('publishing_jobs', 'approved_fingerprint'),
                ('publishing_jobs', 'media_metadata'),
                ('publishing_jobs', 'lease_id'),
                ('pod_call_bookings', 'starts_at'),
                ('manual_payment_requests', 'status'),
                ('plan_negotiations', 'agreed_amount'),
                ('plan_negotiations', 'reel_quota')
            ) AS required(table_name, column_name)
            WHERE NOT EXISTS (
                SELECT 1 FROM information_schema.columns actual
                WHERE actual.table_schema = 'public'
                  AND actual.table_name = required.table_name
                  AND actual.column_name = required.column_name
            );
            IF missing_columns IS NOT NULL THEN
                RAISE EXCEPTION 'Cannot reconcile legacy migration history: missing %',
                    missing_columns;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # A metadata-only merge must never delete legacy schema or data.
    pass
