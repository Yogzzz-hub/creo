"""Apply voice columns after enhancement and BDE schema without rewriting history."""
from alembic import op
revision = "0022_voice_columns"
down_revision = "0021_bde_schema"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TABLE deliverable_history ADD COLUMN IF NOT EXISTS voice_note_url TEXT, ADD COLUMN IF NOT EXISTS voice_note_duration INTEGER")

def downgrade():
    pass
