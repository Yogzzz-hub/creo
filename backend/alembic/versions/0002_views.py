"""0002_views

Creates:
- v_client_onboarding VIEW: derives onboarding stage (1..5) from database facts
- mv_exec_kpis MATERIALIZED VIEW: fast executive analytics (MRR, active clients, turnaround)
  with unique index for concurrent refreshes

Revision ID: 0002_views
Revises: 0001_initial_schema
Create Date: 2026-09-05 19:40:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_views"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. v_client_onboarding view
    op.execute("""
        CREATE OR REPLACE VIEW v_client_onboarding AS
        SELECT
            u.id AS client_id,
            CASE
                WHEN cp.onboarding_completed_at IS NOT NULL THEN 5
                WHEN q.id IS NOT NULL                      THEN 4
                WHEN s.id IS NOT NULL                      THEN 3
                WHEN cp.terms_accepted_at IS NOT NULL      THEN 2
                WHEN (
                    u.email_verified_at IS NOT NULL
                    OR u.account_status != 'pending_verification'
                ) THEN 1
                ELSE 0
            END AS stage
        FROM users u
        LEFT JOIN client_profiles cp ON cp.user_id = u.id
        LEFT JOIN subscriptions s ON s.client_id = u.id AND s.status IN ('trialing', 'active')
        LEFT JOIN questionnaires q ON q.user_id = u.id
        WHERE u.role = 'client';
    """)

    # 2. mv_exec_kpis materialized view (individual op.execute for asyncpg)
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_exec_kpis AS
        SELECT
            NOW() AS refreshed_at,
            COALESCE(
                SUM(p.price_minor) FILTER (WHERE s.status IN ('trialing', 'active')),
                0
            )::BIGINT AS mrr_minor,
            COUNT(DISTINCT s.client_id) FILTER (
                WHERE s.status IN ('trialing', 'active')
            )::INT AS active_clients,
            COUNT(DISTINCT s.client_id) FILTER (
                WHERE s.status = 'canceled' AND s.current_period_end >= NOW() - INTERVAL '30 days'
            )::INT AS churned_last_30d,
            COALESCE(
                AVG(EXTRACT(EPOCH FROM (d.approved_at - d.created_at)) / 3600.0)
                FILTER (WHERE d.status IN ('approved', 'published') AND d.approved_at IS NOT NULL),
                0.0
            )::FLOAT AS avg_turnaround_hours
        FROM plans p
        LEFT JOIN subscriptions s ON s.plan_id = p.id
        LEFT JOIN deliverables d ON d.client_id = s.client_id;
    """)

    # 3. Unique index on materialized view for concurrent refreshes
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_exec_kpis_snapshot ON mv_exec_kpis(refreshed_at);
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_exec_kpis CASCADE;")
    op.execute("DROP VIEW IF EXISTS v_client_onboarding CASCADE;")
