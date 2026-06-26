"""enable_missing_rls

Revision ID: 026
Revises: 025
Create Date: 2026-06-24

"""
from alembic import op


revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None

ENABLE_RLS_TABLES = [
    "subscriptions",
    "addons",
    "team_members",
    "client_assignments",
    "content_plans",
    "deliverable_comments",
    "addon_pricing",
]

POLICIES = {
    "subscriptions": [
        (
            "subscriptions_select_client_own_or_admin",
            "SELECT",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "addons": [
        (
            "addons_select_client_own_or_admin",
            "SELECT",
            """
            USING (
                user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "team_members": [
        (
            "team_members_select_authenticated",
            "SELECT",
            """
            USING (
                get_user_role() IS NOT NULL
            )
            """,
        ),
        (
            "team_members_update_admin_only",
            "UPDATE",
            """
            USING (
                get_user_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "client_assignments": [
        (
            "client_assignments_select_client_own_team_or_admin",
            "SELECT",
            """
            USING (
                client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR team_member_id IN (
                    SELECT tm.id FROM public.team_members tm
                    JOIN public.users u ON u.id = tm.user_id
                    WHERE u.auth_id = auth.uid()
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "content_plans": [
        (
            "content_plans_select_client_own_or_team_or_admin",
            "SELECT",
            """
            USING (
                client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                OR get_user_role() IN ('team_member', 'team_lead', 'admin', 'super_admin')
            )
            """,
        ),
    ],
    "deliverable_comments": [
        (
            "deliverable_comments_select_deliverable_owner_or_team_or_admin",
            "SELECT",
            """
            USING (
                deliverable_id IN (
                    SELECT d.id FROM public.deliverables d
                    WHERE d.client_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
                       OR d.submitted_by IN (
                           SELECT tm.id FROM public.team_members tm
                           JOIN public.users u ON u.id = tm.user_id
                           WHERE u.auth_id = auth.uid()
                       )
                )
                OR get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
    "addon_pricing": [
        (
            "addon_pricing_select_authenticated",
            "SELECT",
            """
            USING (
                get_user_role() IS NOT NULL
            )
            """,
        ),
        (
            "addon_pricing_update_admin_only",
            "UPDATE",
            """
            USING (
                get_user_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                get_user_role() IN ('admin', 'super_admin')
            )
            """,
        ),
    ],
}


def upgrade() -> None:
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