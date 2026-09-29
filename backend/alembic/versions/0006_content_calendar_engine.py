"""Add Content Calendar Engine schema: client_cycles, shoot_days, calendar_policies, calendar_blackouts, and content_calendar extensions.

Revision ID: 0006_content_calendar_engine
Revises: 0005_creative_intelligence
Create Date: 2026-09-13 15:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006_content_calendar_engine'
down_revision = '0005_creative_intelligence'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. client_cycles
    op.execute("""
    CREATE TABLE IF NOT EXISTS client_cycles (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cycle_number  INT  NOT NULL,
      plan_id       UUID NOT NULL REFERENCES plans(id),
      runway_start  DATE,                       -- cycle 1 only
      start_date    DATE NOT NULL,
      end_date      DATE NOT NULL,              -- start + 29
      status        TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','client_review','active','completed','cancelled')),
      quota_snapshot JSONB NOT NULL,            -- quotas AT GENERATION TIME, frozen
      policy_snapshot JSONB NOT NULL,           -- policy AT GENERATION TIME, frozen
      approved_at   TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_cycle UNIQUE (client_id, cycle_number),
      CONSTRAINT ck_cycle_len CHECK (end_date = start_date + 29)
    );
    """)
    op.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_cycle ON client_cycles(client_id)
      WHERE status IN ('client_review','active');
    """)

    # 2. shoot_days
    op.execute("""
    CREATE TABLE IF NOT EXISTS shoot_days (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_id      UUID NOT NULL REFERENCES client_cycles(id) ON DELETE CASCADE,
      client_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sequence      INT  NOT NULL DEFAULT 1,             -- 1 or 2
      scheduled_at  TIMESTAMPTZ NOT NULL,
      duration_min  INT NOT NULL DEFAULT 240,
      location      TEXT,
      status        TEXT NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed','confirmed','reschedule_requested',
                          'rescheduled','completed','no_show','cancelled')),
      proposed_by   UUID REFERENCES users(id),
      requested_at  TIMESTAMPTZ,                          -- client's reschedule request
      requested_for TIMESTAMPTZ,
      request_reason TEXT,
      decided_by    UUID REFERENCES users(id),
      decided_at    TIMESTAMPTZ,
      decision_note TEXT,
      footage_received_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_shoot_upcoming ON shoot_days(scheduled_at)
      WHERE status IN ('proposed','confirmed','reschedule_requested');
    """)

    # 3. extend existing content_calendar
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES client_cycles(id) ON DELETE CASCADE;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS shoot_day_id UUID REFERENCES shoot_days(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS daypart TEXT;")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'B' CHECK (phase IN ('A','B'));")
    op.execute("ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS locked_reason TEXT;")

    # 4. calendar_policies
    op.execute("""
    CREATE TABLE IF NOT EXISTS calendar_policies (
      client_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      niche         TEXT NOT NULL,
      timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      policy        JSONB NOT NULL,
      source        TEXT NOT NULL DEFAULT 'niche_template'
        CHECK (source IN ('niche_template','admin_override','insights_tuned')),
      updated_by    UUID REFERENCES users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """)

    # 5. calendar_blackouts
    op.execute("""
    CREATE TABLE IF NOT EXISTS calendar_blackouts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID REFERENCES users(id) ON DELETE CASCADE,
      blackout_on DATE NOT NULL,
      reason      TEXT NOT NULL,
      created_by  UUID REFERENCES users(id)
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_blackout_lookup ON calendar_blackouts(client_id, blackout_on);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS calendar_blackouts CASCADE;")
    op.execute("DROP TABLE IF EXISTS calendar_policies CASCADE;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS locked_reason;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS phase;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS daypart;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS publish_at;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS shoot_day_id;")
    op.execute("ALTER TABLE content_calendar DROP COLUMN IF EXISTS cycle_id;")
    op.execute("DROP TABLE IF EXISTS shoot_days CASCADE;")
    op.execute("DROP TABLE IF EXISTS client_cycles CASCADE;")
