"""add plan_negotiations table

Revision ID: 0009_plan_negotiations
Revises: c71a2fc5b835
Create Date: 2026-09-30 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0009_plan_negotiations'
down_revision: Union[str, None] = 'c71a2fc5b835'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'plan_negotiations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('client_name', sa.String(length=255), nullable=False),
        sa.Column('client_email', sa.String(length=255), nullable=False),
        sa.Column('target_topic', sa.String(length=255), nullable=False),
        sa.Column('proposed_offer', sa.Text(), nullable=True),
        sa.Column('phone_number', sa.String(length=50), nullable=False),
        sa.Column('preferred_time', sa.String(length=255), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='Pending Review', nullable=False),
        sa.Column('counter_price', sa.BigInteger(), nullable=True),
        sa.Column('counter_note', sa.Text(), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_plan_negotiations_agency_id', 'plan_negotiations', ['agency_id'])
    op.create_index('idx_plan_neg_status', 'plan_negotiations', ['status', 'created_at'])

    # Backfill historical bargain requests from audit_log if any exist
    op.execute("""
        INSERT INTO plan_negotiations (
            client_id, client_name, client_email, target_topic, proposed_offer,
            phone_number, preferred_time, notes, status, created_at
        )
        SELECT 
            u.id,
            COALESCE(al.to_value->>'client_name', u.full_name, 'Client'),
            COALESCE(al.to_value->>'client_email', u.email, 'client@creo.agency'),
            COALESCE(al.to_value->>'topic', 'Custom Pricing / Retainer Discount'),
            al.to_value->>'offer',
            COALESCE(al.to_value->>'phone', '—'),
            COALESCE(al.to_value->>'preferred_time', 'Immediate / ASAP'),
            al.to_value->>'notes',
            'Pending Review',
            al.created_at
        FROM audit_log al
        LEFT JOIN users u ON u.id = NULLIF(al.to_value->>'client_id', '')::uuid
        WHERE al.action = 'book_bargain_call';
    """)


def downgrade() -> None:
    op.drop_index('idx_plan_neg_status', table_name='plan_negotiations')
    op.drop_index('ix_plan_negotiations_agency_id', table_name='plan_negotiations')
    op.drop_table('plan_negotiations')
