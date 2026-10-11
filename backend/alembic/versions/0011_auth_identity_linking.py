"""Link Google and password sign-in to one account per email.

- users.google_sub records the Google identity linked to an account.
- Emails are normalized to lowercase and made unique case-insensitively, so
  "Name@x.com" and "name@x.com" can no longer become two accounts. Rows that
  would collide are left untouched and reported instead of being merged.
- Clients created through Google/OTP sign-in were missing agency_id and
  email_verified_at; both are backfilled the way password sign-up sets them.

Revision ID: 0011_auth_identity_linking
Revises: de3c9e6c146f
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0011_auth_identity_linking"
down_revision = "de3c9e6c146f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)")

    op.execute("""
        UPDATE users u SET email = lower(btrim(u.email))
        WHERE u.email <> lower(btrim(u.email))
          AND NOT EXISTS (
              SELECT 1 FROM users o
              WHERE o.id <> u.id AND lower(btrim(o.email)) = lower(btrim(u.email))
          )
    """)
    duplicate_count = op.get_bind().execute(sa.text("""
        SELECT count(*) FROM (
            SELECT 1 FROM users GROUP BY lower(email) HAVING count(*) > 1
        ) d
    """)).scalar_one()
    if duplicate_count:
        logging.getLogger("alembic.runtime.migration").warning(
            "%s email address(es) belong to several case-variant accounts. Merge them "
            "(SELECT lower(email) FROM users GROUP BY 1 HAVING count(*) > 1), then run "
            "CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email)).",
            duplicate_count,
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users (lower(email))")
    else:
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (lower(email))")

    op.execute("""
        UPDATE users SET agency_id = (
            SELECT id FROM agencies
            ORDER BY (status = 'active') DESC, created_at ASC
            LIMIT 1
        )
        WHERE agency_id IS NULL AND role = 'client' AND EXISTS (SELECT 1 FROM agencies)
    """)
    op.execute("""
        UPDATE users SET email_verified_at = created_at
        WHERE email_verified_at IS NULL
          AND (auth_id LIKE 'auth-google-%' OR auth_id LIKE 'auth-otp-%')
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_email_lower")
    op.execute("DROP INDEX IF EXISTS ix_users_email_lower")
    op.execute("DROP INDEX IF EXISTS ix_users_google_sub")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_sub")
