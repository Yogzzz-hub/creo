"""create_platform_settings

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
    op.create_table(
        'platform_settings',
        sa.Column('id', sa.Text(), nullable=False),
        sa.Column('sla_delivery_days', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('sla_revision_hours', sa.Integer(), nullable=False, server_default='24'),
        sa.Column('scarcity_slots_available', sa.Integer(), server_default='5', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Insert the default row so the application's query has something to fetch
    op.execute("""
        INSERT INTO platform_settings (id, sla_delivery_days, sla_revision_hours, scarcity_slots_available) 
        VALUES ('default', 3, 24, 5) 
        ON CONFLICT DO NOTHING;
    """)

def downgrade() -> None:
    op.drop_table('platform_settings')