import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.exc import MultipleResultsFound

from app.core.errors import Forbidden
from app.routers.admin import get_client_brand_profile, get_sla_performance, get_sla_breaches
from app.models.enums import UserRole


@pytest.mark.asyncio
async def test_client_profile_accepts_multiple_assignments_in_leads_pod():
    lead_id, client_id = uuid.uuid4(), uuid.uuid4()
    class ProfileReached(Exception):
        pass
    async def execute(statement):
        table = statement.get_final_froms()[0].name
        if table == "client_profiles":
            raise ProfileReached()
        raise AssertionError(table)
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=client_id, role="client")), execute=execute)
    actor = SimpleNamespace(user_id=lead_id, role="team_lead")
    with pytest.raises(ProfileReached):
        await get_client_brand_profile(str(client_id), db, actor)


@pytest.mark.asyncio
async def test_team_lead_can_view_unassigned_client_profile():
    lead_id, client_id = uuid.uuid4(), uuid.uuid4()
    class ProfileReached(Exception):
        pass
    async def execute(statement):
        table = statement.get_final_froms()[0].name
        if table == "client_profiles":
            raise ProfileReached()
        raise AssertionError(table)
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=client_id, role="client")), execute=execute)
    actor = SimpleNamespace(user_id=lead_id, role="team_lead")
    with pytest.raises(ProfileReached):
        await get_client_brand_profile(str(client_id), db, actor)


@pytest.mark.asyncio
async def test_unassigned_editor_is_forbidden_from_client_profile():
    editor_id, client_id = uuid.uuid4(), uuid.uuid4()
    async def execute(statement):
        return SimpleNamespace(scalar_one_or_none=lambda: None)
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=client_id, role="client")), execute=execute)
    actor = SimpleNamespace(user_id=editor_id, role="editor")
    with pytest.raises(Forbidden) as excinfo:
        await get_client_brand_profile(str(client_id), db, actor)
    assert excinfo.value.code == "NOT_ASSIGNED_TO_CLIENT"

