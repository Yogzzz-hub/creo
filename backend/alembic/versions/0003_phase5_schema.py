"""0003_phase5_schema

Adds:
- plans.scarcity_slots column
- tasks.last_sla_notified_at column
- Performance indexes on tasks, deliverables, and plans for Phase 5 SLAs and KPIs

Revision ID: 0003_phase5_schema
Revises: 0002_views
Create Date: 2026-09-05 20:30:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_phase5_schema"
down_revision: str | None = "0002_views"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Scarcity slots on plans
    op.execute("""
        ALTER TABLE plans
        ADD COLUMN IF NOT EXISTS scarcity_slots INT DEFAULT NULL;
    """)

    # 2. Last SLA notified at on tasks
    op.execute("""
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS last_sla_notified_at TIMESTAMPTZ DEFAULT NULL;
    """)

    # 3. High-performance composite indexes
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_tasks_kanban
        ON tasks(status, created_at DESC);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_tasks_sla
        ON tasks(status, sla_due_at)
        WHERE status NOT IN ('ready_to_publish', 'completed');
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_deliverables_approved_turnaround
        ON deliverables(status, approved_at, created_at)
        WHERE status IN ('approved', 'published') AND approved_at IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_deliverables_approved_turnaround;")
    op.execute("DROP INDEX IF EXISTS idx_tasks_sla;")
    op.execute("DROP INDEX IF EXISTS idx_tasks_kanban;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS last_sla_notified_at;")
    op.execute("ALTER TABLE plans DROP COLUMN IF EXISTS scarcity_slots;")
