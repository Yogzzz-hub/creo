"""Add DirectMessage model

Revision ID: 7ba467e463fc
Revises: 0009_plan_negotiations
Create Date: 2026-10-02 09:42:03.165057

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ba467e463fc'
down_revision: Union[str, None] = '0009_plan_negotiations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only DirectMessage belongs to this migration; preserve unrelated integrity.
    op.create_table('direct_messages',
    sa.Column('agency_id', sa.UUID(), nullable=True),
    sa.Column('client_id', sa.UUID(), nullable=False),
    sa.Column('specialist_id', sa.UUID(), nullable=False),
    sa.Column('sender_id', sa.UUID(), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('thread_type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['specialist_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_direct_messages_agency_id'), 'direct_messages', ['agency_id'], unique=False)
    op.create_index(op.f('ix_direct_messages_client_id'), 'direct_messages', ['client_id'], unique=False)
    op.create_index(op.f('ix_direct_messages_specialist_id'), 'direct_messages', ['specialist_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # Only DirectMessage belongs to this migration; preserve unrelated integrity.
    op.drop_index(op.f('ix_direct_messages_specialist_id'), table_name='direct_messages')
    op.drop_index(op.f('ix_direct_messages_client_id'), table_name='direct_messages')
    op.drop_index(op.f('ix_direct_messages_agency_id'), table_name='direct_messages')
    op.drop_table('direct_messages')
    # ### end Alembic commands ###
