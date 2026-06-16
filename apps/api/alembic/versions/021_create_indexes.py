"""create_performance_indexes

Revision ID: 021
Revises: 020
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa


revision = "021"
down_revision = "c571fe7a6082"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_auth_id", "users", ["auth_id"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    # --- tasks ---
    op.create_index("ix_tasks_assigned_to_status", "tasks", ["assigned_to", "status"], unique=False)
    op.create_index("ix_tasks_client_id_status", "tasks", ["client_id", "status"], unique=False)

    # --- deliverables ---
    op.create_index("ix_deliverables_client_id_status", "deliverables", ["client_id", "status"], unique=False)

    # --- content_calendar ---
    op.create_index("ix_content_calendar_client_id_scheduled_date", "content_calendar", ["client_id", "scheduled_date"], unique=False)

    # --- notifications ---
    op.create_index("ix_notifications_user_id_is_read", "notifications", ["user_id", "is_read"], unique=False)

    # --- tickets ---
    op.create_index("ix_tickets_user_id_status", "tickets", ["user_id", "status"], unique=False)

    # --- escalations ---
    op.create_index("ix_escalations_status_created_at", "escalations", ["status", "created_at"], unique=False)

    # --- subscriptions ---
    op.create_index("ix_subscriptions_user_id_status", "subscriptions", ["user_id", "status"], unique=False)

    # --- addons ---
    op.create_index("ix_addons_user_id_status", "addons", ["user_id", "status"], unique=False)

    # --- leave_requests ---
    op.create_index("ix_leave_requests_team_member_id_status", "leave_requests", ["team_member_id", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_leave_requests_team_member_id_status", table_name="leave_requests")
    op.drop_index("ix_addons_user_id_status", table_name="addons")
    op.drop_index("ix_subscriptions_user_id_status", table_name="subscriptions")
    op.drop_index("ix_escalations_status_created_at", table_name="escalations")
    op.drop_index("ix_tickets_user_id_status", table_name="tickets")
    op.drop_index("ix_notifications_user_id_is_read", table_name="notifications")
    op.drop_index("ix_content_calendar_client_id_scheduled_date", table_name="content_calendar")
    op.drop_index("ix_deliverables_client_id_status", table_name="deliverables")
    op.drop_index("ix_tasks_client_id_status", table_name="tasks")
    op.drop_index("ix_tasks_assigned_to_status", table_name="tasks")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_auth_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
