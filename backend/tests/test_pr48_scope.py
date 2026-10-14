import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from app.routers.payments import _authorize_split_client
from app.routers.bde import sa_scope
from app.models.enums import UserRole

@pytest.mark.asyncio
async def test_split_payment_rejects_cross_agency_staff():
    actor=SimpleNamespace(role='admin',user_id=uuid.uuid4(),agency_id=uuid.uuid4())
    db=SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(role='client',agency_id=uuid.uuid4())))
    with pytest.raises(HTTPException) as error:
        await _authorize_split_client(db,actor,uuid.uuid4(),write=True)
    assert error.value.status_code==403

@pytest.mark.asyncio
async def test_client_cannot_change_own_split_payment():
    user_id=uuid.uuid4();agency_id=uuid.uuid4()
    actor=SimpleNamespace(role='client',user_id=user_id,agency_id=agency_id)
    db=SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(role='client',agency_id=agency_id)))
    with pytest.raises(HTTPException):
        await _authorize_split_client(db,actor,user_id,write=True)
    await _authorize_split_client(db,actor,user_id)

def test_bde_scope_requires_agency_for_regular_staff():
    with pytest.raises(HTTPException):
        sa_scope(SimpleNamespace(role=UserRole.SALES,agency_id=None))
