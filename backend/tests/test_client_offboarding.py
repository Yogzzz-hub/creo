import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.errors import Forbidden, NotFound
from app.core.rbac import Actor
from app.models.enums import AccountStatus, SubscriptionStatus, UserRole
from app.routers import admin


@pytest.mark.asyncio
@pytest.mark.parametrize("already_suspended", [False, True])
async def test_offboarding_persists_subscription_and_access_changes(monkeypatch, already_suspended):
    agency_id, client_id = uuid.uuid4(), uuid.uuid4()
    client = SimpleNamespace(id=client_id, role=UserRole.CLIENT, agency_id=agency_id,
                             account_status=AccountStatus.SUSPENDED if already_suspended else AccountStatus.ACTIVE,
                             token_version=3)
    subscription = SimpleNamespace(status=SubscriptionStatus.ACTIVE)
    counter = SimpleNamespace(quota=30, used=7)
    db = MagicMock()
    db.get = AsyncMock(return_value=client)
    locked = MagicMock()
    locked.scalar_one.return_value = client
    subs, usage = MagicMock(), MagicMock()
    subs.scalars.return_value.all.return_value = [subscription]
    usage.scalars.return_value.all.return_value = [counter]
    db.execute = AsyncMock(side_effect=[locked, subs, usage, MagicMock()])
    db.commit = AsyncMock()
    session_cache, dashboard_cache = AsyncMock(), AsyncMock()
    monkeypatch.setattr(admin, "invalidate_user_session", session_cache)
    monkeypatch.setattr("app.core.dashboard_cache.invalidate_dashboard_cache", dashboard_cache)
    actor = Actor(user_id=uuid.uuid4(), agency_id=agency_id, role=UserRole.ADMIN)
    result = await admin.offboard_client(client_id, db=db, actor=actor)
    assert result["status"] == "offboarded"
    assert subscription.status == SubscriptionStatus.CANCELED
    assert counter.quota == 0 and counter.used == 7
    assert client.account_status == AccountStatus.SUSPENDED
    assert client.token_version == (3 if already_suspended else 4)
    db.commit.assert_awaited_once()
    session_cache.assert_awaited_once_with(client_id, agency_id=agency_id)
    dashboard_cache.assert_awaited_once()
    assert "DELETE FROM client_assignments" in str(db.execute.call_args_list[-1].args[0])
    assert db.add.call_args.args[0].action == "client_offboarded"


@pytest.mark.asyncio
@pytest.mark.parametrize("wrong_role", [False, True])
async def test_offboarding_rejects_other_agency_and_nonclient_targets(wrong_role):
    client_id = uuid.uuid4()
    client = SimpleNamespace(role=UserRole.ADMIN if wrong_role else UserRole.CLIENT, agency_id=uuid.uuid4())
    db = MagicMock(get=AsyncMock(return_value=client), execute=AsyncMock(), commit=AsyncMock())
    actor = Actor(user_id=uuid.uuid4(), agency_id=uuid.uuid4(), role=UserRole.ADMIN)
    with pytest.raises(NotFound if wrong_role else Forbidden):
        await admin.offboard_client(client_id, db=db, actor=actor)
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()
