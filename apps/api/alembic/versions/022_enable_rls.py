"""enable_rls

Revision ID: 022
Revises: 021
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa


revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None

HELPER_FUNCTION = """
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;
"""

DROP_HELPER_FUNCTION = """
DROP FUNCTION IF EXISTS public.get_user_role();
"""

ENABLE_RLS_TABLES = [
    "users",
    "questionnaires",
    "deliverables",
    "tickets",
    "ticket_messages",
    "notifications",
    "tasks",
    "announcements",
    "content_calendar",
    "escalations",
    "leave_requests",
]

POLICIES = {
    "users": [
        (
            "users_select_own_or_admin",
            "SELECT",
            """
            USING (
                auth_id = auth.uid()
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
        (
            "users_update_own_or_admin",
            "UPDATE",
            """
            USING (
                auth_id = auth.uid()
                OR get_user_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                auth_id = auth.uid()
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "questionnaires": [
        (
            "questionnaires_select_client_own_or_team",
            "SELECT",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('team_member', 'team_lead', 'admin', 'super_admin')
            )
            """,
        ),
        (
            "questionnaires_update_client_within_7d_or_admin",
            "UPDATE",
            """
            USING (
                (
                    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                    AND submitted_at >= now() - interval '7 days'
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                (
                    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                    AND submitted_at >= now() - interval '7 days'
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "deliverables": [
        (
            "deliverables_select_client_own_or_team_or_admin",
            "SELECT",
            """
            USING (
                client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR submitted_by IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
        (
            "deliverables_update_team_produced_or_client_own_or_admin",
            "UPDATE",
            """
            USING (
                submitted_by IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                submitted_by IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "tickets": [
        (
            "tickets_select_client_own_or_assigned_or_admin",
            "SELECT",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR assigned_to IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "ticket_messages": [
        (
            "ticket_messages_select_participants_or_admin",
            "SELECT",
            """
            USING (
                ticket_id IN (
                    SELECT t.id FROM public.tickets t
                    WHERE t.user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR t.assigned_to IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
        (
            "ticket_messages_insert_participants_or_admin",
            "INSERT",
            """
            WITH CHECK (
                ticket_id IN (
                    SELECT t.id FROM public.tickets t
                    WHERE t.user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR t.assigned_to IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "notifications": [
        (
            "notifications_select_own",
            "SELECT",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
            )
            """,
        ),
        (
            "notifications_update_own_is_read",
            "UPDATE",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
            )
            WITH CHECK (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
            )
            """,
        ),
    ],
    "tasks": [
        (
            "tasks_select_assigned_or_admin_lead",
            "SELECT",
            """
            USING (
                assigned_to IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR get_user_role() IN ('admin', 'super_admin', 'team_lead')
            )
            """,
        ),
    ],
    "announcements": [
        (
            "announcements_select_internal_non_client",
            "SELECT",
            """
            USING (
                get_user_role() NOT IN ('client')
                AND get_user_role() IS NOT NULL
            )
            """,
        ),
    ],
    "content_calendar": [
        (
            "content_calendar_select_client_own_or_team_or_admin",
            "SELECT",
            """
            USING (
                client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('team_member', 'team_lead', 'admin', 'super_admin')
            )
            """,
        ),
    ],
    "escalations": [
        (
            "escalations_select_lead_or_admin",
            "SELECT",
            """
            USING (
                get_user_role() IN ('team_lead', 'admin', 'super_admin')
            )
            """,
        ),
    ],
    "leave_requests": [
        (
            "leave_requests_select_own_or_lead_dept_or_admin",
            "SELECT",
            """
            USING (
                team_member_id IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR (
                    get_user_role() = 'team_lead'
                    AND team_member_id IN (
                        SELECT tm2.id FROM public.team_members tm2
                        WHERE tm2.department = (
                            SELECT tm3.department FROM public.team_members tm3
                            JOIN public.users u3 ON u3.id = tm3.user_id
                            WHERE u3.auth_id = auth.uid()
                            LIMIT 1
                        )
                    )
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
}


def upgrade() -> None:
    op.execute(HELPER_FUNCTION)

    for table in ENABLE_RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

    for table, policies in POLICIES.items():
        for policy_name, command, body in policies:
            op.execute(
                f"CREATE POLICY {policy_name} ON {table} FOR {command} {body};"
            )


def downgrade() -> None:
    for table, policies in POLICIES.items():
        for policy_name, _, _ in policies:
            op.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table};")

    for table in reversed(ENABLE_RLS_TABLES):
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.execute(DROP_HELPER_FUNCTION)
