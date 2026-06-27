"""merge dev branches

Revision ID: bf64ebde6d00
Revises: 033, f6a7b8c9
Create Date: 2026-06-27 15:42:42.170117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf64ebde6d00'
down_revision: Union[str, Sequence[str], None] = ('033', 'f6a7b8c9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
