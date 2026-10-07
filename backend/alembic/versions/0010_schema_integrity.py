"""Restore ownership uniqueness after legacy DirectMessage migration.

Fresh installs preserve the constraints in the corrected predecessor. Existing
installations get a forward repair without deleting or merging any user data.
Equivalent unique indexes/primary keys are retained rather than duplicated.
"""

from alembic import op

revision = "0010_schema_integrity"
down_revision = "7ba467e463fc"
branch_labels = None
depends_on = None

INTEGRITY_KEYS = (
    ("users", ("email",)),
    ("agencies", ("slug",)),
    ("client_profiles", ("user_id",)),
    ("staff_profiles", ("user_id",)),
    ("team_members", ("team_id", "user_id")),
    ("teams", ("agency_id", "name")),
)


def upgrade() -> None:
    for table, columns in INTEGRITY_KEYS:
        names = ", ".join(f"'{column}'" for column in columns)
        keys = ", ".join(f'"{column}"' for column in columns)
        index = f"uq_integrity_{table}"
        op.execute(f"""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_index i
                    JOIN pg_class t ON t.oid = i.indrelid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    WHERE n.nspname = current_schema() AND t.relname = '{table}'
                      AND i.indisunique AND i.indisvalid
                      AND i.indpred IS NULL AND i.indexprs IS NULL
                      AND ARRAY(
                          SELECT a.attname::text
                          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinal)
                          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                          ORDER BY k.ordinal
                      ) = ARRAY[{names}]::text[]
                ) THEN
                    CREATE UNIQUE INDEX "{index}" ON "{table}" ({keys});
                END IF;
            END $$;
        """)
    # Plan names are tenant-specific; do not reintroduce global uniqueness.
    op.execute("CREATE INDEX IF NOT EXISTS ix_plans_name ON plans (name)")


def downgrade() -> None:
    # Keep restored integrity when rolling back application code. Dropping these
    # protections could reintroduce duplicate identities or ownership records.
    pass
