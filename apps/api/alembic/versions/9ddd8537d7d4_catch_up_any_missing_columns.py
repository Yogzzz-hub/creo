"""Catch up any missing columns

Revision ID: 9ddd8537d7d4
Revises: 4e4b0885fa87
Create Date: 2026-08-10 21:37:30.266870

"""
from typing import Sequence, Union
import logging

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '9ddd8537d7d4'
down_revision: Union[str, Sequence[str], None] = '4e4b0885fa87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

log = logging.getLogger('alembic')

def has_column(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns

def safe_rename(table: str, old_col: str, new_col: str):
    has_old = has_column(table, old_col)
    has_new = has_column(table, new_col)

    if has_old and has_new:
        raise Exception(f"Migration Error: Both '{old_col}' and '{new_col}' exist in table '{table}'. Manual resolution required.")
    
    if has_old and not has_new:
        log.info(f"Renaming {table}.{old_col} to {new_col}")
        op.alter_column(table, old_col, new_column_name=new_col)
    
    if not has_old and has_new:
        log.info(f"Skipping rename {table}.{old_col} to {new_col} (already applied)")

    if not has_old and not has_new:
        raise Exception(f"Migration Error: Neither '{old_col}' nor '{new_col}' exist in table '{table}'.")

def add_if_not_exists(table: str, col: str, col_type, **kwargs):
    if not has_column(table, col):
        log.info(f"Adding new column {table}.{col}")
        op.add_column(table, sa.Column(col, col_type, **kwargs))
    else:
        log.info(f"Skipping add_column for {table}.{col} (already exists)")

def add_fk_if_not_exists(table: str, fk_name: str, column: str, ref_table: str, ref_column: str = 'id'):
    conn = op.get_bind()
    inspector = inspect(conn)
    fks = [fk['name'] for fk in inspector.get_foreign_keys(table)]
    if fk_name not in fks:
        log.info(f"Adding foreign key {fk_name} to {table}")
        op.create_foreign_key(fk_name, table, ref_table, [column], [ref_column])

def align_naming_conventions(table: str, old_col: str, new_col: str):
    conn = op.get_bind()
    inspector = inspect(conn)
    
    op.execute(f"ALTER INDEX IF EXISTS ix_{table}_{old_col} RENAME TO ix_{table}_{new_col}")
    op.execute(f"ALTER INDEX IF EXISTS ix_{table}_{old_col}_status RENAME TO ix_{table}_{new_col}_status")
    
    fks = [fk['name'] for fk in inspector.get_foreign_keys(table)]
    old_fk_name = f"{table}_{old_col}_fkey"
    new_fk_name = f"{table}_{new_col}_fkey"
    
    if old_fk_name in fks and new_fk_name not in fks:
        log.info(f"Renaming constraint {old_fk_name} to {new_fk_name}")
        op.execute(f"ALTER TABLE {table} RENAME CONSTRAINT {old_fk_name} TO {new_fk_name}")

def upgrade() -> None:
    safe_rename('custom_pricing', 'user_id', 'client_id')
    align_naming_conventions('custom_pricing', 'user_id', 'client_id')

    safe_rename('addons', 'user_id', 'client_id')
    align_naming_conventions('addons', 'user_id', 'client_id')

    safe_rename('tickets', 'user_id', 'client_id')
    align_naming_conventions('tickets', 'user_id', 'client_id')

    safe_rename('leave_requests', 'approved_by', 'reviewed_by')
    align_naming_conventions('leave_requests', 'approved_by', 'reviewed_by')

    safe_rename('escalations', 'reason', 'description')

    add_if_not_exists('addon_pricing', 'updated_by', sa.UUID(as_uuid=False), nullable=True)
    add_fk_if_not_exists('addon_pricing', 'addon_pricing_updated_by_fkey', 'updated_by', 'users')

    add_if_not_exists('addons', 'gateway_payment_id', sa.Text(), nullable=True)
    add_if_not_exists('addons', 'content_brief', sa.Text(), nullable=True)
    add_if_not_exists('addons', 'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    
    add_if_not_exists('custom_pricing', 'standard_price', sa.Numeric(10, 2), nullable=False, server_default='0')
    op.alter_column('custom_pricing', 'standard_price', server_default=None)
    add_if_not_exists('custom_pricing', 'discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0')
    op.alter_column('custom_pricing', 'discount_percent', server_default=None)
    add_if_not_exists('custom_pricing', 'notes', sa.Text(), nullable=True)

    add_if_not_exists('escalations', 'type', sa.Text(), nullable=False, server_default='standard')
    op.alter_column('escalations', 'type', server_default=None)
    
    add_if_not_exists('escalations', 'ticket_id', sa.UUID(as_uuid=False), nullable=True)
    add_fk_if_not_exists('escalations', 'escalations_ticket_id_fkey', 'ticket_id', 'tickets')
    
    add_if_not_exists('escalations', 'resolved_by', sa.UUID(as_uuid=False), nullable=True)
    add_fk_if_not_exists('escalations', 'escalations_resolved_by_fkey', 'resolved_by', 'users')
    
    conn = op.get_bind()
    inspector = inspect(conn)
    cols = {c['name']: c for c in inspector.get_columns('escalations')}
    if cols['severity']['type'].__class__.__name__ != 'INTEGER':
        op.execute("ALTER TABLE escalations ALTER COLUMN severity TYPE INTEGER USING severity::integer")

    add_if_not_exists('leave_requests', 'reviewed_at', sa.DateTime(timezone=True), nullable=True)
    add_if_not_exists('tasks', 'requested_by', sa.UUID(as_uuid=False), nullable=True)
    add_fk_if_not_exists('tasks', 'tasks_requested_by_fkey', 'requested_by', 'users')
    
    add_if_not_exists('ticket_messages', 'file_name', sa.Text(), nullable=True)
    add_if_not_exists('ticket_messages', 'file_size_bytes', sa.BigInteger(), nullable=True)
    if not has_column('ticket_messages', 'is_read'):
        op.add_column('ticket_messages', sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'))

    if not has_column('tickets', 'ticket_number'):
        op.add_column('tickets', sa.Column('ticket_number', sa.String(), nullable=False, server_default='TKT-MIGRATION'))
        op.alter_column('tickets', 'ticket_number', server_default=None)
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_tickets_ticket_number ON tickets (ticket_number)")

    add_if_not_exists('tickets', 'linked_deliverable_id', sa.UUID(as_uuid=False), nullable=True)
    add_fk_if_not_exists('tickets', 'tickets_linked_deliverable_id_fkey', 'linked_deliverable_id', 'deliverables')
    add_if_not_exists('tickets', 'reopened_at', sa.DateTime(timezone=True), nullable=True)
    add_if_not_exists('tickets', 'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))

    op.alter_column('addons', 'gateway',
               existing_type=postgresql.ENUM('razorpay', 'stripe', name='payment_gateway'),
               nullable=False)
               
    if has_column('custom_pricing', 'requested_by'):
        op.alter_column('custom_pricing', 'requested_by', existing_type=sa.UUID(), nullable=False)
    else:
        op.add_column('custom_pricing', sa.Column('requested_by', sa.UUID(as_uuid=False), nullable=True))
        op.execute("UPDATE custom_pricing SET requested_by = client_id WHERE requested_by IS NULL")
        op.alter_column('custom_pricing', 'requested_by', nullable=False)
    add_fk_if_not_exists('custom_pricing', 'custom_pricing_requested_by_fkey', 'requested_by', 'users')

    op.alter_column('escalations', 'client_id', existing_type=sa.UUID(), nullable=True)
    op.alter_column('escalations', 'task_id', existing_type=sa.UUID(), nullable=True)
    
    op.alter_column('leave_requests', 'reason', existing_type=sa.TEXT(), nullable=True)
    op.alter_column('ticket_messages', 'message_text', existing_type=sa.TEXT(), nullable=True)


def downgrade() -> None:
    safe_rename('custom_pricing', 'client_id', 'user_id')
    align_naming_conventions('custom_pricing', 'client_id', 'user_id')

    safe_rename('addons', 'client_id', 'user_id')
    align_naming_conventions('addons', 'client_id', 'user_id')

    safe_rename('tickets', 'client_id', 'user_id')
    align_naming_conventions('tickets', 'client_id', 'user_id')

    safe_rename('leave_requests', 'reviewed_by', 'approved_by')
    align_naming_conventions('leave_requests', 'reviewed_by', 'approved_by')

    safe_rename('escalations', 'description', 'reason')

    log.warning("Downgrade preserves recently added columns (updated_by, gateway_payment_id, etc) to avoid accidental data loss.")
    
    op.alter_column('escalations', 'client_id', existing_type=sa.UUID(), nullable=False)
    op.alter_column('escalations', 'task_id', existing_type=sa.UUID(), nullable=False)
    
    op.alter_column('addons', 'gateway',
               existing_type=postgresql.ENUM('razorpay', 'stripe', name='payment_gateway'),
               nullable=True)
