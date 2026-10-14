"""Existing staff enum values must not break shared workstation queries."""
from sqlalchemy.dialects import postgresql

from app.models.enums import UserRole
from app.models.user import User


def test_existing_freelancer_role_can_be_loaded_from_staff_rows():
    processor = User.__table__.c.role.type.result_processor(postgresql.dialect(), None)
    assert processor('freelancer') == UserRole.FREELANCER
    assert processor('editor') == UserRole.EDITOR


def test_unrecognized_roles_remain_rejected():
    import pytest
    processor = User.__table__.c.role.type.result_processor(postgresql.dialect(), None)
    with pytest.raises(LookupError):
        processor('unknown_privileged_role')
