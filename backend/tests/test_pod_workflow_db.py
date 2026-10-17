"""Regression for real task persistence and lead dashboard visibility, on a disposable DB only."""
import os
import uuid
from unittest.mock import AsyncMock, patch

import pytest

if "test" not in os.environ.get("DATABASE_URL", "").rsplit("/", 1)[-1]:
    pytest.skip("requires a disposable PostgreSQL test database", allow_module_level=True)

from app.core.rbac import Actor
from app.db.session import AsyncSessionLocal, tenant_session
from app.models.tenant import Agency
from app.models.user import User, StaffProfile, ClientProfile
from app.models.work import ClientAssignment, Task
from app.models.enums import UserRole, AccountStatus
from app.routers.tasks import create_task, TaskCreateRequest
from app.routers.admin import get_pod_dashboard
from app.services import deliverable_workflow as workflow


@pytest.mark.asyncio
async def test_dispatched_task_survives_session_and_uploaded_file_enters_lead_qa():
    agency, lead, creative, client = [uuid.uuid4() for _ in range(4)]
    lead_email = uuid.uuid4().hex + "@example.test"
    lead_actor = Actor(user_id=lead, role=UserRole.TEAM_LEAD, agency_id=agency, email=lead_email)
    async with AsyncSessionLocal() as db, tenant_session(db, agency_id=agency):
        db.add(Agency(id=agency, name="Pod regression", slug=uuid.uuid4().hex))
        await db.flush()
        for uid, role, email in [(lead, UserRole.TEAM_LEAD, lead_email),
            (creative, UserRole.EDITOR, uuid.uuid4().hex+"@example.test"),
            (client, UserRole.CLIENT, uuid.uuid4().hex+"@example.test")]:
            db.add(User(id=uid, agency_id=agency, email=email, auth_id=uuid.uuid4().hex,
                full_name="Regression " + role.value, role=role, account_status=AccountStatus.ACTIVE))
        await db.flush()
        db.add_all([StaffProfile(user_id=lead, agency_id=agency),
            StaffProfile(user_id=creative, agency_id=agency, team_lead_id=lead),
            ClientProfile(user_id=client, company_name="Regression client"),
            ClientAssignment(client_id=client, user_id=lead, agency_id=agency, role="team_lead")])
        await db.commit()
        created = await create_task(TaskCreateRequest(client_id=client, assignee_id=creative,
            deliverable_type="reel", title="yolo", brief="Regression dispatch"), db, lead_actor)
        task_id = created.id
        assert created.status == "in_production" and created.assigned_to == creative

    # A new connection proves it is not merely an ORM/browser-local card.
    async with AsyncSessionLocal() as db, tenant_session(db, agency_id=agency):
        task = await db.get(Task, task_id)
        assert task.blueprint["concept_name"] == "yolo"
        dashboard = get_pod_dashboard.__wrapped__
        with patch.object(workflow.storage_service, "resolve_media_urls", AsyncMock(return_value={})):
            before = await dashboard(db=db, actor=lead_actor)
            assert [t["id"] for t in before["tasks"]["in_production"]] == [str(task_id)]
            assert not before["tasks"]["internal_qa"]
            editor = Actor(user_id=creative, role=UserRole.EDITOR, agency_id=agency)
            upload = await workflow.submit_task_deliverable(db, editor, task,
                file_url=f"clients/{client}/test.mp4", mime_type="video/mp4", file_size_bytes=100)
            after = await dashboard(db=db, actor=lead_actor)
            assert not after["tasks"]["in_production"]
            qa = after["tasks"]["internal_qa"]
            assert len(qa) == 1 and qa[0]["deliverable"]["id"] == str(upload.id)
            assert qa[0]["deliverable"]["status"] == "pending_qa"
            assert next(m for m in after["members"] if m["id"] == str(creative))["active_wip"] == 1


