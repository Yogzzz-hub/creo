import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.exc import MultipleResultsFound

from app.routers.admin import get_client_brand_profile


@pytest.mark.asyncio
async def test_client_profile_accepts_multiple_assignments_in_leads_pod():
    lead_id, client_id = uuid.uuid4(), uuid.uuid4()
    assignments = [uuid.uuid4(), uuid.uuid4()]
    class ProfileReached(Exception):
        pass
    async def execute(statement):
        table = statement.get_final_froms()[0].name
        if table == "staff_profiles":
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [uuid.uuid4(), uuid.uuid4()]))
        if table == "client_assignments":
            # The pod legitimately has two assignments for the same client.
            rows = assignments[:statement._limit_clause.value] if statement._limit_clause is not None else assignments
            def scalar_one_or_none():
                if len(rows) > 1:
                    raise MultipleResultsFound()
                return rows[0] if rows else None
            return SimpleNamespace(scalar_one_or_none=scalar_one_or_none)
        if table == "client_profiles":
            raise ProfileReached()
        raise AssertionError(table)
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=client_id, role="client")), execute=execute)
    actor = SimpleNamespace(user_id=lead_id, role="team_lead")
    with pytest.raises(ProfileReached):
        await get_client_brand_profile(str(client_id), db, actor)
