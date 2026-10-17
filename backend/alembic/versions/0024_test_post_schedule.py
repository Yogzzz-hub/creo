from alembic import op

revision = "0024_test_post_schedule"
down_revision = "0023_instagram_test_posts"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TABLE instagram_test_posts ADD COLUMN scheduled_at timestamptz, ADD COLUMN actor_context jsonb NOT NULL DEFAULT '{}'")
    op.execute("CREATE INDEX ix_test_posts_due ON instagram_test_posts(status, scheduled_at)")

def downgrade():
    op.execute("DROP INDEX ix_test_posts_due")
    op.execute("ALTER TABLE instagram_test_posts DROP COLUMN scheduled_at, DROP COLUMN actor_context")
