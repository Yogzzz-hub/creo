"""sync model renames — safe column renames and additions

Revision ID: 031
Revises: 030
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa


revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── addon_pricing ───────────────────────────────────────────────────
    # Add missing updated_by column
    op.add_column(
        "addon_pricing",
        sa.Column(
            "updated_by",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )

    # ── addons ──────────────────────────────────────────────────────────
    # Rename user_id → client_id (preserves data + FK to users.id)
    op.alter_column("addons", "user_id", new_column_name="client_id")
    op.drop_index("ix_addons_user_id", table_name="addons")
    op.create_index("ix_addons_client_id", "addons", ["client_id"])

    # Rename payment_id → gateway_payment_id
    op.alter_column("addons", "payment_id", new_column_name="gateway_payment_id")

    # Make gateway non-nullable (set NULL rows to 'razorpay' as safe default)
    op.execute("UPDATE addons SET gateway = 'razorpay' WHERE gateway IS NULL")
    op.alter_column("addons", "gateway", nullable=False)

    # Add missing columns
    op.add_column("addons", sa.Column("content_brief", sa.Text(), nullable=True))
    op.add_column(
        "addons",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
    )
    op.execute("""
        DROP TRIGGER IF EXISTS update_addons_updated_at ON addons;
        CREATE TRIGGER update_addons_updated_at
            BEFORE UPDATE ON addons
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)

    # ── tickets ─────────────────────────────────────────────────────────
    # Rename user_id → client_id
    op.alter_column("tickets", "user_id", new_column_name="client_id")
    op.drop_index("ix_tickets_user_id", table_name="tickets")
    op.create_index("ix_tickets_client_id", "tickets", ["client_id"])

    # Add missing columns
    op.add_column(
        "tickets",
        sa.Column("ticket_number", sa.String(), nullable=True),
    )
    op.execute("""
        UPDATE tickets SET ticket_number = 'TK-' || id::text
        WHERE ticket_number IS NULL
    """)
    op.alter_column("tickets", "ticket_number", nullable=False)
    op.create_unique_constraint("uq_tickets_ticket_number", "tickets", ["ticket_number"])
    op.create_index("ix_tickets_ticket_number", "tickets", ["ticket_number"])

    op.add_column(
        "tickets",
        sa.Column(
            "linked_deliverable_id",
            sa.UUID(),
            sa.ForeignKey("deliverables.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "tickets",
        sa.Column("reopened_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tickets",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
    )
    op.execute("""
        DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
        CREATE TRIGGER update_tickets_updated_at
            BEFORE UPDATE ON tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)

    # Make message_text nullable in ticket_messages
    op.alter_column(
        "ticket_messages", "message_text",
        existing_type=sa.Text(),
        nullable=True,
    )

    # Add missing columns to ticket_messages
    op.add_column(
        "ticket_messages",
        sa.Column("file_name", sa.Text(), nullable=True),
    )
    op.add_column(
        "ticket_messages",
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "ticket_messages",
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # ── custom_pricing ──────────────────────────────────────────────────
    # Rename user_id → client_id
    op.alter_column("custom_pricing", "user_id", new_column_name="client_id")
    op.drop_index("ix_custom_pricing_user_id", table_name="custom_pricing")
    op.create_index("ix_custom_pricing_client_id", "custom_pricing", ["client_id"])

    # Add missing columns
    op.add_column(
        "custom_pricing",
        sa.Column("standard_price", sa.Numeric(10, 2), nullable=True),
    )
    op.execute("""
        UPDATE custom_pricing cp
        SET standard_price = p.monthly_price
        FROM plans p
        WHERE cp.plan_id = p.id AND cp.standard_price IS NULL
    """)
    op.alter_column("custom_pricing", "standard_price", nullable=False)

    op.add_column(
        "custom_pricing",
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True),
    )
    op.execute("""
        UPDATE custom_pricing
        SET discount_percent = 0
        WHERE discount_percent IS NULL
    """)
    op.alter_column("custom_pricing", "discount_percent", nullable=False)

    op.add_column(
        "custom_pricing",
        sa.Column(
            "requested_by",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.execute("""
        UPDATE custom_pricing
        SET requested_by = client_id
        WHERE requested_by IS NULL
    """)
    op.alter_column("custom_pricing", "requested_by", nullable=False)

    op.add_column(
        "custom_pricing",
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # ── escalations ─────────────────────────────────────────────────────
    # Rename reason → description
    op.alter_column("escalations", "reason", new_column_name="description")

    # Change severity from Integer to Text (cast existing data)
    op.execute("ALTER TABLE escalations ALTER COLUMN severity TYPE TEXT USING severity::text")
    op.execute("UPDATE escalations SET severity = 'low' WHERE severity = '1'")
    op.execute("UPDATE escalations SET severity = 'medium' WHERE severity = '2'")
    op.execute("UPDATE escalations SET severity = 'high' WHERE severity = '3'")
    op.execute("UPDATE escalations SET severity = 'critical' WHERE severity = '4'")

    # Make task_id nullable (model allows it)
    op.alter_column("escalations", "task_id", nullable=True)

    # Add missing columns
    op.add_column(
        "escalations",
        sa.Column("type", sa.Text(), nullable=True),
    )
    op.execute("UPDATE escalations SET type = 'general' WHERE type IS NULL")
    op.alter_column("escalations", "type", nullable=False)

    op.add_column(
        "escalations",
        sa.Column(
            "ticket_id",
            sa.UUID(),
            sa.ForeignKey("tickets.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "escalations",
        sa.Column(
            "resolved_by",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )

    # Change status default from 'open' to 'active'
    op.alter_column(
        "escalations", "status",
        server_default="active",
    )
    op.execute("UPDATE escalations SET status = 'active' WHERE status = 'open'")

    # ── leave_requests ──────────────────────────────────────────────────
    # Rename approved_by → reviewed_by
    op.alter_column("leave_requests", "approved_by", new_column_name="reviewed_by")

    # Add reviewed_at
    op.add_column(
        "leave_requests",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Make reason nullable (model allows it)
    op.alter_column(
        "leave_requests", "reason",
        existing_type=sa.Text(),
        nullable=True,
    )


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
