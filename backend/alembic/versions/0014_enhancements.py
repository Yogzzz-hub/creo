"""Recognize the legacy revision recorded by an existing deployment.

The original enhancement migration is absent from the available Git history.
Read-only inspection confirmed that this database already has the canonical
0014 prerequisites, as well as additional tables and columns. This compatibility
marker deliberately does not recreate or remove those unknown enhancements.
The following merge revision checks prerequisites before accepting the history.
"""

revision = "0014_enhancements"
down_revision = "0014_manual_payment_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
