import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.core.errors import Forbidden
from app.models.enums import UserRole
from app.routers.tasks import TaskCreateRequest, create_task


@pytest.mark.asyncio
@pytest.mark.parametrize("case", ["foreign_pod", "foreign_agency", "inactive", "client_role"])
async def test_dispatch_rejects_invalid_specialist_before_saving(case):
    agency, lead, client_id, specialist_id = [uuid.uuid4() for _ in range(4)]
    client = SimpleNamespace(id=client_id, role=UserRole.CLIENT, agency_id=agency)
    specialist = SimpleNamespace(id=specialist_id, role=UserRole.EDITOR,
        agency_id=agency, account_status="active")
    if case == "foreign_agency":
        specialist.agency_id = uuid.uuid4()
    elif case == "inactive":
        specialist.account_status = "suspended"
    elif case == "client_role":
        specialist.role = UserRole.CLIENT
    db = AsyncMock()
    db.get.side_effect = [client, specialist]
    db.scalar.return_value = SimpleNamespace(team_lead_id=uuid.uuid4())
    actor = SimpleNamespace(user_id=lead, agency_id=agency, role=UserRole.TEAM_LEAD)
    with patch("app.services.deliverable_workflow.on_client_pod", AsyncMock(return_value=True)):
        with pytest.raises(Forbidden):
            await create_task(TaskCreateRequest(client_id=client_id, assignee_id=specialist_id,
                deliverable_type="reel", title="Persistent dispatch"), db, actor)
    db.commit.assert_not_awaited()
