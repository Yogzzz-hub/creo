"""Calendar ownership and commercial API permissions across every implemented role."""
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import httpx
import pytest
from app.core.client_scope import ensure_client_access
from app.core.errors import Forbidden
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import UserRole, DeliverableStatus
from app.main import app
from app.routers.calendar import ApproveConceptRequest, approve_concept_endpoint, get_calendar_entries

@pytest.mark.asyncio
@pytest.mark.parametrize("role", list(UserRole))
@pytest.mark.parametrize("write", [False, True])
async def test_every_role_client_workspace_access(role, write):
    client_id, agency_id = uuid.uuid4(), uuid.uuid4()
    actor = Actor(user_id=client_id if role == UserRole.CLIENT else uuid.uuid4(), role=role, agency_id=agency_id)
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(role=UserRole.CLIENT, agency_id=agency_id)),
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: uuid.uuid4())))
    permitted = role in {UserRole.CLIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_LEAD} or (not write and role in {UserRole.EDITOR, UserRole.DESIGNER})
    if permitted:
        await ensure_client_access(db, actor, client_id, write=write)
    else:
        with pytest.raises(Forbidden): await ensure_client_access(db, actor, client_id, write=write)

@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.TEAM_LEAD, UserRole.EDITOR, UserRole.DESIGNER])
async def test_unassigned_team_cannot_read_client(role):
    agency = uuid.uuid4()
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(role=UserRole.CLIENT, agency_id=agency)),
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: None)))
    with pytest.raises(Forbidden):
        await ensure_client_access(db, Actor(user_id=uuid.uuid4(), role=role, agency_id=agency), uuid.uuid4())

@pytest.mark.asyncio
async def test_client_cannot_approve_another_clients_concept_using_url_id():
    db = SimpleNamespace(get=AsyncMock(), execute=AsyncMock(), commit=AsyncMock())
    with pytest.raises(Forbidden):
        await approve_concept_endpoint(uuid.uuid4(), ApproveConceptRequest(selected_hook={"title":"Chosen"}),
            uuid.uuid4(), Actor(user_id=uuid.uuid4(), role=UserRole.CLIENT), db)
    db.get.assert_not_awaited()
    db.commit.assert_not_awaited()

@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.EDITOR, UserRole.DESIGNER])
async def test_other_agency_client_is_denied(role):
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(role=UserRole.CLIENT, agency_id=uuid.uuid4())))
    with pytest.raises(Forbidden):
        await ensure_client_access(db, Actor(user_id=uuid.uuid4(), role=role, agency_id=uuid.uuid4()), uuid.uuid4())

@pytest.mark.asyncio
@pytest.mark.parametrize("role", [r for r in UserRole if r not in {UserRole.ADMIN, UserRole.SUPER_ADMIN}])
async def test_non_admin_roles_cannot_change_client_price_through_api(role):
    actor = Actor(user_id=uuid.uuid4(), role=role)
    async def actor_override(): return actor
    async def db_override(): yield SimpleNamespace()
    app.dependency_overrides[get_current_actor] = actor_override
    app.dependency_overrides[get_db] = db_override
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            r = await api.post(f"/api/v1/admin/clients/{uuid.uuid4()}/fix-plan", json={"custom_price":1, "is_custom":True})
        assert r.status_code == 403, r.text
    finally:
        app.dependency_overrides.pop(get_current_actor, None)
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_calendar_does_not_expose_internal_qa_media(monkeypatch):
    from datetime import date
    from app.routers import calendar
    client_id = uuid.uuid4()
    cal = SimpleNamespace(id=uuid.uuid4(), client_id=client_id, publish_date=date.today(), scheduled_time=None,
        caption="Planned reel", slot_kind="reel", status="draft", is_locked=False, blueprint=None, selected_hook=None, flex_deadline=None)
    internal = SimpleNamespace(id=uuid.uuid4(), status=DeliverableStatus.PENDING_QA, file_url="clients/private.mp4")
    db = SimpleNamespace(execute=AsyncMock(side_effect=[SimpleNamespace(all=lambda:[(cal,internal,None)]), SimpleNamespace(all=lambda:[])]))
    monkeypatch.setattr("app.services.onboarding_service.get_onboarding_status", AsyncMock(return_value=SimpleNamespace(is_complete=True)))
    monkeypatch.setattr("app.services.subscription_guard.check_client_subscription", AsyncMock(return_value={"is_active":True}))
    result = await calendar.get_calendar_entries(None, Actor(user_id=client_id,role=UserRole.CLIENT), db)
    assert result[0]["file_url"] is None
    assert result[0]["deliverable_id"] is None
    assert result[0]["status"] == "draft"


@pytest.mark.asyncio
async def test_ops_calendar_without_subscription_does_not_invent_fallback_entitlement():
    from app.services.calendar_engine import generate_client_cycle
    from app.core.errors import PaymentRequired
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(agency_id=None)),
        execute=AsyncMock(return_value=SimpleNamespace(first=lambda:None)), add=MagicMock())
    with pytest.raises(PaymentRequired):
        await generate_client_cycle(db, uuid.uuid4())
    db.add.assert_not_called()
    assert db.execute.await_count == 1

@pytest.mark.asyncio
async def test_ops_calendar_cannot_select_another_clients_plan():
    from app.services.calendar_engine import generate_client_cycle
    from app.core.errors import Conflict
    plan = SimpleNamespace(id=uuid.uuid4())
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(agency_id=None)),
        execute=AsyncMock(return_value=SimpleNamespace(first=lambda:(SimpleNamespace(),plan))), add=MagicMock())
    with pytest.raises(Conflict):
        await generate_client_cycle(db, uuid.uuid4(), plan_id=uuid.uuid4())
    db.add.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("status, uploaded", [("active", False), ("client_review", False), ("draft", True)])
async def test_cycle_regeneration_cannot_delete_approved_or_uploaded_work(status, uploaded):
    from app.services.calendar_engine import _clear_replaceable_draft
    from app.core.errors import Conflict
    cycle = SimpleNamespace(id=uuid.uuid4(), status=status)
    results = [None, SimpleNamespace(scalar_one_or_none=lambda:cycle)]
    if status == "draft": results.append(SimpleNamespace(scalar_one_or_none=lambda:uuid.uuid4()))
    db = SimpleNamespace(execute=AsyncMock(side_effect=results), commit=AsyncMock())
    with pytest.raises(Conflict): await _clear_replaceable_draft(db, uuid.uuid4(), 1, replace_draft=True)
    db.commit.assert_not_awaited()
    assert db.execute.await_count == (3 if uploaded else 2)


@pytest.mark.asyncio
async def test_duplicate_cycle_generation_returns_conflict_without_deleting_draft():
    from app.services.calendar_engine import _clear_replaceable_draft
    from app.core.errors import Conflict
    db = SimpleNamespace(execute=AsyncMock(side_effect=[None,
        SimpleNamespace(scalar_one_or_none=lambda:SimpleNamespace(id=uuid.uuid4(), status="draft"))]))
    with pytest.raises(Conflict) as failure: await _clear_replaceable_draft(db, uuid.uuid4(), 1)
    assert failure.value.code == "CYCLE_EXISTS"
    assert db.execute.await_count == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [r for r in UserRole if r != UserRole.SUPER_ADMIN])
@pytest.mark.parametrize("operation", ["concept", "generate", "publish", "approve"])
async def test_direct_calendar_api_cross_client_access_is_blocked(role, operation):
    own, other, slot_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    actor = Actor(user_id=own, role=role, agency_id=uuid.uuid4())
    record = SimpleNamespace(client_id=other, agency_id=uuid.uuid4(), role=UserRole.CLIENT)
    db = SimpleNamespace(get=AsyncMock(return_value=record), execute=AsyncMock(), commit=AsyncMock())
    async def actor_override(): return actor
    async def db_override(): yield db
    paths = {
        "concept": (f"/api/v1/calendar/{other}/slots/{slot_id}/approve-concept", {"selected_hook":{}}),
        "generate": (f"/api/v1/ops/clients/{other}/cycles/generate", {}),
        "publish": (f"/api/v1/ops/cycles/{slot_id}/publish-draft", {}),
        "approve": (f"/api/v1/portal/cycles/{slot_id}/approve", {}),
    }
    app.dependency_overrides[get_current_actor] = actor_override
    app.dependency_overrides[get_db] = db_override
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            path, payload = paths[operation]
            response = await api.post(path, json=payload)
        assert response.status_code == 403, response.text
        db.commit.assert_not_awaited()
    finally:
        app.dependency_overrides.pop(get_current_actor, None)
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_calendar_feedback_notifies_assigned_lead():
    from app.routers.calendar import portal_comment_cycle, CycleCommentRequest
    client_id, lead_id = uuid.uuid4(), uuid.uuid4()
    cycle = SimpleNamespace(id=uuid.uuid4(), client_id=client_id, agency_id=uuid.uuid4())
    db = SimpleNamespace(get=AsyncMock(return_value=cycle),
        execute=AsyncMock(return_value=SimpleNamespace(scalars=lambda:SimpleNamespace(all=lambda:[lead_id]))),
        add=MagicMock(), commit=AsyncMock())
    await portal_comment_cycle(cycle.id, CycleCommentRequest(body="Please move the launch story"), db,
        Actor(user_id=client_id, role=UserRole.CLIENT))
    notifications = [call.args[0] for call in db.add.call_args_list]
    assert any(n.user_id == lead_id and "move the launch story" in n.message for n in notifications)
    db.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_approved_cycle_cannot_be_sent_back_to_review():
    from app.routers.calendar import ops_publish_draft
    from app.core.errors import Conflict
    client_id = uuid.uuid4()
    cycle = SimpleNamespace(id=uuid.uuid4(), client_id=client_id, status="active")
    db = SimpleNamespace(get=AsyncMock(side_effect=[cycle, SimpleNamespace(role=UserRole.CLIENT), cycle]),
        commit=AsyncMock())
    with pytest.raises(Conflict):
        await ops_publish_draft(cycle.id, db, Actor(user_id=uuid.uuid4(), role=UserRole.SUPER_ADMIN))
    assert cycle.status == "active"
    db.commit.assert_not_awaited()
