"""Create deliverables and deliverable_comments tables

Revision ID: 011
Revises: 010
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa


revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "deliverables",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", sa.UUID(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("client_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("submitted_by", sa.UUID(), sa.ForeignKey("team_members.id"), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.dialects.postgresql.ENUM(
            "pending_approval", "approved", "rejected", "revision_in_progress", "revised_pending_approval",
            name="deliverable_status", create_type=False
        ), nullable=False, server_default="pending_approval"),
        sa.Column("revision_round", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("parent_deliverable_id", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("instagram_published_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("instagram_post_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_deliverables_task_id", "deliverables", ["task_id"])
    op.create_index("ix_deliverables_client_id", "deliverables", ["client_id"])
    op.create_index("ix_deliverables_submitted_by", "deliverables", ["submitted_by"])
    op.create_index("ix_deliverables_status", "deliverables", ["status"])
    op.create_index("ix_deliverables_parent_deliverable_id", "deliverables", ["parent_deliverable_id"])

    op.execute("""
        ALTER TABLE deliverables
            ADD CONSTRAINT fk_deliverables_parent
            FOREIGN KEY (parent_deliverable_id) REFERENCES deliverables(id)
    """)

    op.execute("""
        CREATE TRIGGER update_deliverables_updated_at
            BEFORE UPDATE ON deliverables
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)

    op.create_table(
        "deliverable_comments",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deliverable_id", sa.UUID(), sa.ForeignKey("deliverables.id"), nullable=False),
        sa.Column("author_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_deliverable_comments_deliverable_id", "deliverable_comments", ["deliverable_id"])
    op.create_index("ix_deliverable_comments_author_id", "deliverable_comments", ["author_id"])

    op.execute("""
        ALTER TABLE content_calendar
            ADD CONSTRAINT fk_content_calendar_linked_task
            FOREIGN KEY (linked_task_id) REFERENCES tasks(id)
    """)

    op.execute("""
        ALTER TABLE content_calendar
            ADD CONSTRAINT fk_content_calendar_linked_deliverable
            FOREIGN KEY (linked_deliverable_id) REFERENCES deliverables(id)
    """)

    op.execute("""
        ALTER TABLE tasks
            ADD CONSTRAINT fk_tasks_calendar_entry
            FOREIGN KEY (calendar_entry_id) REFERENCES content_calendar(id)
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_calendar_entry")
    op.execute("ALTER TABLE content_calendar DROP CONSTRAINT IF EXISTS fk_content_calendar_linked_deliverable")
    op.execute("ALTER TABLE content_calendar DROP CONSTRAINT IF EXISTS fk_content_calendar_linked_task")
    op.execute("DROP TRIGGER IF EXISTS update_deliverables_updated_at ON deliverables")
    op.drop_index("ix_deliverable_comments_author_id", table_name="deliverable_comments")
    op.drop_index("ix_deliverable_comments_deliverable_id", table_name="deliverable_comments")
    op.drop_table("deliverable_comments")
    op.execute("ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS fk_deliverables_parent")
    op.drop_index("ix_deliverables_parent_deliverable_id", table_name="deliverables")
    op.drop_index("ix_deliverables_status", table_name="deliverables")
    op.drop_index("ix_deliverables_submitted_by", table_name="deliverables")
    op.drop_index("ix_deliverables_client_id", table_name="deliverables")
    op.drop_index("ix_deliverables_task_id", table_name="deliverables")
    op.drop_table("deliverables")
