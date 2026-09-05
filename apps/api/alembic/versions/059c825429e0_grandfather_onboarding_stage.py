"""grandfather onboarding stage

Revision ID: 059c825429e0
Revises: d84988f003c2
Create Date: 2026-08-11 16:19:50.919251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '059c825429e0'
down_revision: Union[str, Sequence[str], None] = 'd84988f003c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Grandfather existing users who had an active, lapsed, or suspended account status
    # into onboarding_stage 5 (completed onboarding).
    op.execute(
        "UPDATE users SET onboarding_stage = 5 WHERE account_status IN ('active', 'lapsed', 'suspended');"
    )
    # Also anyone with a plan_name could reasonably be stage 2 or 3, but let's stick to 
    # ensuring active users are not locked out.


def downgrade() -> None:
    # We cannot safely downgrade onboarding_stage back to 1 for just legacy users
    # as we don't know who was grandfathered vs who naturally progressed.
    pass
