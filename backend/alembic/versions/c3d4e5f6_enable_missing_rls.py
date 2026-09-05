"""enable_missing_rls

Revision ID: c3d4e5f6
Revises: b2c3d4e5
Create Date: 2026-06-24

"""
from alembic import op


revision = "c3d4e5f6"
down_revision = "b2c3d4e5"
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
    pass


def downgrade() -> None:
    pass