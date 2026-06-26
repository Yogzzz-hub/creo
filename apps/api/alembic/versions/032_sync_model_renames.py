"""sync model renames — safe column renames and additions

Revision ID: 032
Revises: 031
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All operations in this migration were already applied by 031.
    # This file is a no-op to avoid DuplicateColumn / DuplicateObject errors.
    pass


def downgrade() -> None:
    # ── leave_requests ──────────────────────────────────────────────────
    op.alter_column(
        "leave_requests", "reason",
        existing_type=sa.Text(),
        nullable=False,
    )
    op.drop_column("leave_requests", "reviewed_at")
    op.alter_column("leave_requests", "reviewed_by", new_column_name="approved_by")

    # ── escalations ─────────────────────────────────────────────────────
    op.alter_column("escalations", "status", server_default="open")
    op.execute("UPDATE escalations SET status = 'open' WHERE status = 'active'")
    op.drop_column("escalations", "resolved_by")
    op.drop_column("escalations", "ticket_id")
    op.drop_column("escalations", "type")
    op.alter_column("escalations", "task_id", nullable=False)
    op.execute("UPDATE escalations SET severity = '4' WHERE severity = 'critical'")
    op.execute("UPDATE escalations SET severity = '3' WHERE severity = 'high'")
    op.execute("UPDATE escalations SET severity = '2' WHERE severity = 'medium'")
    op.execute("UPDATE escalations SET severity = '1' WHERE severity = 'low'")
    op.execute("ALTER TABLE escalations ALTER COLUMN severity TYPE INTEGER USING severity::integer")
    op.alter_column("escalations", "description", new_column_name="reason")

    # ── custom_pricing ──────────────────────────────────────────────────
    op.drop_column("custom_pricing", "notes")
    op.drop_column("custom_pricing", "requested_by")
    op.drop_column("custom_pricing", "discount_percent")
    op.drop_column("custom_pricing", "standard_price")
    op.drop_index("ix_custom_pricing_client_id", table_name="custom_pricing")
    op.create_index("ix_custom_pricing_user_id", "custom_pricing", ["user_id"])
    op.alter_column("custom_pricing", "client_id", new_column_name="user_id")

    # ── tickets ─────────────────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets")
    op.drop_column("ticket_messages", "is_read")
    op.drop_column("ticket_messages", "file_size_bytes")
    op.drop_column("ticket_messages", "file_name")
    op.alter_column(
        "ticket_messages", "message_text",
        existing_type=sa.Text(),
        nullable=False,
    )
    op.drop_column("tickets", "updated_at")
    op.drop_column("tickets", "reopened_at")
    op.drop_column("tickets", "linked_deliverable_id")
    op.drop_index("ix_tickets_ticket_number", table_name="tickets")
    op.drop_constraint("uq_tickets_ticket_number", "tickets", type_="unique")
    op.drop_column("tickets", "ticket_number")
    op.drop_index("ix_tickets_client_id", table_name="tickets")
    op.create_index("ix_tickets_user_id", "tickets", ["user_id"])
    op.alter_column("tickets", "client_id", new_column_name="user_id")

    # ── addons ──────────────────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS update_addons_updated_at ON addons")
    op.drop_column("addons", "updated_at")
    op.drop_column("addons", "content_brief")
    op.alter_column("addons", "gateway", nullable=True)
    op.alter_column("addons", "gateway_payment_id", new_column_name="payment_id")
    op.drop_index("ix_addons_client_id", table_name="addons")
    op.create_index("ix_addons_user_id", "addons", ["user_id"])
    op.alter_column("addons", "client_id", new_column_name="user_id")

    # ── addon_pricing ───────────────────────────────────────────────────
    op.drop_column("addon_pricing", "updated_by")
