"""merge multiple heads

Revision ID: f5a0c3a02f61
Revises: 036, e593ce1857e0
Create Date: 2026-07-08 17:14:39.442653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a0c3a02f61'
down_revision: Union[str, Sequence[str], None] = ('036', 'e7f8a9b0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
