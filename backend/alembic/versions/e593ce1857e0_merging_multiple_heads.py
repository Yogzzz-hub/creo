"""merging multiple heads

Revision ID: e593ce1857e0
Revises: 035, bf64ebde6d00
Create Date: 2026-07-02 14:11:34.400842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e593ce1857e0'
down_revision: Union[str, Sequence[str], None] = ('035', 'bf64ebde6d00')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
