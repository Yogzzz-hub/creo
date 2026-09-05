"""Create tickets and ticket_messages tables

Revision ID: 012
Revises: 011
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tickets",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticket_type", sa.dialects.postgresql.ENUM(
            "deliverable_revision", "general_support", "billing_issue", "content_brief_update",
            name="ticket_type", create_type=False
        ), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "open", "in_progress", "awaiting_client", "resolved", "escalated",
            name="ticket_status", create_type=False
        ), nullable=False, server_default="open"),
        sa.Column("assigned_to", sa.UUID(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_index("ix_tickets_user_id", "tickets", ["user_id"])
    op.create_index("ix_tickets_status", "tickets", ["status"])
    op.create_index("ix_tickets_assigned_to", "tickets", ["assigned_to"])

    op.create_table(
        "ticket_messages",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ticket_id", sa.UUID(), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("sender_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message_text", sa.Text(), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_ticket_messages_ticket_id", "ticket_messages", ["ticket_id"])
    op.create_index("ix_ticket_messages_sender_id", "ticket_messages", ["sender_id"])


def downgrade() -> None:
    op.drop_index("ix_ticket_messages_sender_id", table_name="ticket_messages")
    op.drop_index("ix_ticket_messages_ticket_id", table_name="ticket_messages")
    op.drop_table("ticket_messages")
    op.drop_index("ix_tickets_assigned_to", table_name="tickets")
    op.drop_index("ix_tickets_status", table_name="tickets")
    op.drop_index("ix_tickets_user_id", table_name="tickets")
    op.drop_table("tickets")
