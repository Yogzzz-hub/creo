"""Merge multiple heads

Revision ID: 4e4b0885fa87
Revises: 036b, 041, f5a0c3a02f61
Create Date: 2026-08-09 17:56:36.954344

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e4b0885fa87'
down_revision: Union[str, Sequence[str], None] = ('036b', '041', 'f5a0c3a02f61')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
