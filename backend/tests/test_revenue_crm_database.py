"""Opt-in real PostgreSQL integration tests; never touch the application's DB.

Run with CRM_TEST_DATABASE_URL pointing to migrated localhost/creo_test_*.
"""

import os
import uuid
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from urllib.parse import urlparse

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import event, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.errors import AppError
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db, receive_begin, tenant_session
from app.models.enums import AccountStatus, UserRole
from app.models.revenue_crm import CRMTask
from app.models.tenant import Agency
from app.models.user import StaffProfile, User
from app.routers import revenue_crm as api

URL = os.getenv("CRM_TEST_DATABASE_URL", "")
if URL:
    parsed = urlparse(URL)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or not parsed.path.startswith(
        "/creo_test_"
    ):
        raise RuntimeError("CRM_TEST_DATABASE_URL must be a disposable localhost creo_test_* DB")
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not URL, reason="Disposable CRM_TEST_DATABASE_URL not configured"),
]


@pytest_asyncio.fixture
async def workspace():
    engine = create_async_engine(URL, poolclass=NullPool)
    admin_factory = async_sessionmaker(engine, expire_on_commit=False)
    agency, other_agency = uuid.uuid4(), uuid.uuid4()
    ids = {
        name: uuid.uuid4()
        for name in ["bde", "peer", "head", "outsider", "admin", "client", "platform"]
    }
    roles = {
        "bde": UserRole.BDE,
        "peer": UserRole.BDE,
        "head": UserRole.BDE_HEAD,
        "outsider": UserRole.BDE,
        "admin": UserRole.ADMIN,
        "client": UserRole.CLIENT,
        "platform": UserRole.SUPER_ADMIN,
    }
    actors = {
        name: Actor(
            user_id=ids[name],
            role=role,
            agency_id=None
            if name == "platform"
            else other_agency
            if name == "outsider"
            else agency,
        )
        for name, role in roles.items()
    }
    async with admin_factory() as db:
        db.add_all(
            [
                Agency(id=agency, name="CRM Test", slug=str(agency), status="active"),
                Agency(id=other_agency, name="Other CRM", slug=str(other_agency), status="active"),
            ]
        )
        await db.flush()
        for name, role in roles.items():
            db.add(
                User(
                    id=ids[name],
                    agency_id=actors[name].agency_id,
                    auth_id=str(ids[name]),
                    email=f"{ids[name]}@example.test",
                    full_name=name,
                    role=role,
                    account_status=AccountStatus.ACTIVE,
                )
            )
        await db.flush()
        db.add(
            StaffProfile(
                user_id=ids["bde"], agency_id=agency, team_lead_id=ids["head"], department="sales"
            )
        )
        await db.commit()
        await db.execute(
            text(
                """DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='crm_runtime') THEN CREATE ROLE crm_runtime NOLOGIN; END IF; END $$"""
            )
        )
        await db.execute(text("GRANT USAGE ON SCHEMA public TO crm_runtime"))
        await db.execute(
            text("GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO crm_runtime")
        )
        await db.commit()
    request_engine = create_async_engine(URL, poolclass=NullPool)

    @event.listens_for(request_engine.sync_engine, "begin")
    def apply_scope(connection):
        connection.execute(text("SET LOCAL ROLE crm_runtime"))
        receive_begin(connection)

    factory = async_sessionmaker(request_engine, expire_on_commit=False)
    state = {"actor": actors["bde"]}
    app = FastAPI()
    app.include_router(api.router, prefix="/api/v1")
    app.include_router(api.public_router, prefix="/api/v1")
    app.dependency_overrides[get_current_actor] = lambda: state["actor"]

    async def database():
        async with factory() as db:
            async with tenant_session(
                db,
                state["actor"].agency_id,
                is_platform_admin=state["actor"].role == UserRole.SUPER_ADMIN,
            ):
                yield db

    app.dependency_overrides[get_db] = database

    @app.exception_handler(AppError)
    async def errors(request, error):
        return JSONResponse(
            {"error": {"code": error.code, "message": error.message}}, status_code=error.status_code
        )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield SimpleNamespace(
            client=client,
            state=state,
            actors=actors,
            ids=ids,
            agency=agency,
            factory=admin_factory,
            runtime_factory=factory,
        )
    await request_engine.dispose()
    await engine.dispose()


async def create_lead(w, **overrides):
    data = {
        "name": "Client Contact",
        "company_name": "Example Brand",
        "phone": "+919876543210",
        "due_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
        **overrides,
    }
    response = await w.client.post("/api/v1/crm/leads", json=data)
    assert response.status_code == 201, response.text
    return response.json()


async def proposal(w, lead_id, **overrides):
    data = {
        "lead_id": lead_id,
        "title": "Creative proposal",
        "valid_until": (datetime.now(UTC) + timedelta(days=10)).isoformat(),
        "items": [
            {
                "title": "Brand design",
                "quantity": "2",
                "unit_price": 10000,
                "discount_bps": 2000,
                "billing": "one_time",
            },
            {"title": "Monthly content", "quantity": "1", "unit_price": 5000, "billing": "monthly"},
        ],
        **overrides,
    }
    response = await w.client.post("/api/v1/crm/proposals", json=data)
    assert response.status_code == 201, response.text
    return response.json()


async def test_assigned_leads_and_team_scope_do_not_leak(workspace):
    w = workspace
    lead = await create_lead(w)
    for name, expected in [("peer", 0), ("outsider", 0), ("head", 1), ("admin", 1)]:
        w.state["actor"] = w.actors[name]
        response = await w.client.get("/api/v1/crm/leads")
        assert response.status_code == 200
        assert len(response.json()) == expected
        detail = await w.client.get(f"/api/v1/crm/leads/{lead['id']}")
        assert detail.status_code == (200 if expected else 404)
    w.state["actor"] = w.actors["client"]
    assert (await w.client.get("/api/v1/crm/leads")).status_code == 403


async def test_duplicate_contact_and_import_preview_do_not_overwrite(workspace):
    w = workspace
    await create_lead(w)
    response = await w.client.post(
        "/api/v1/crm/leads",
        json={
            "name": "Duplicate",
            "company_name": "Other Name",
            "phone": "+91 (98765) 43210",
            "due_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
        },
    )
    assert response.status_code == 409 and response.json()["error"]["code"] == "DUPLICATE_CONTACT"
    response = await w.client.post(
        "/api/v1/crm/imports",
        json={
            "csv_text": "name,company_name,phone\nDuplicate,Other,+919876543210",
            "due_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "commit": False,
        },
    )
    assert response.status_code == 200 and response.json()["rows"][0]["status"] == "duplicate"
    assert len((await w.client.get("/api/v1/crm/leads")).json()) == 1


async def test_task_completion_requires_next_action_and_keeps_calendar_consistent(workspace):
    w = workspace
    lead = await create_lead(w)
    task = (await w.client.get("/api/v1/crm/tasks")).json()[0]
    response = await w.client.post(
        f"/api/v1/crm/tasks/{task['id']}/action",
        json={"action": "complete", "reason": "Client requested proposal"},
    )
    assert response.status_code == 409
    due = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    response = await w.client.post(
        f"/api/v1/crm/tasks/{task['id']}/action",
        json={
            "action": "complete",
            "reason": "Client requested proposal",
            "next_title": "Prepare proposal",
            "due_at": due,
        },
    )
    assert response.status_code == 200
    detail = (await w.client.get(f"/api/v1/crm/leads/{lead['id']}")).json()
    assert detail["lead"]["metadata_extra"]["next_action"] == "Prepare proposal"
    assert (
        len(
            [
                t
                for t in (await w.client.get("/api/v1/crm/tasks")).json()
                if t["status"] == "pending"
            ]
        )
        == 1
    )


async def test_proposal_pricing_approval_client_decision_revision_and_pdf(workspace):
    w = workspace
    lead = await create_lead(w)
    quote = await proposal(w, lead["id"])
    assert quote["snapshot"]["totals"]["one_time"]["total"] == 16000
    assert quote["snapshot"]["totals"]["monthly"]["total"] == 5000
    assert quote["approval_required"]
    action = f"/api/v1/crm/proposals/{quote['id']}/action"
    assert (await w.client.post(action, json={"action": "share"})).status_code == 409
    assert (await w.client.post(action, json={"action": "approve"})).status_code == 403
    w.state["actor"] = w.actors["head"]
    assert (await w.client.post(action, json={"action": "approve"})).status_code == 200
    response = await w.client.post(action, json={"action": "share"})
    assert response.status_code == 200, response.text
    token = response.json()["share_path"].split("/")[-1]
    pdf = await w.client.get(f"/api/v1/crm/proposals/{quote['id']}/pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF-")
    public = f"/api/v1/public/crm/proposals/{token}"
    view = await w.client.get(public)
    assert view.status_code == 200 and view.json()["status"] == "viewed"
    assert "owner_id" not in view.json() and "share_hash" not in view.json()
    issued_pdf = await w.client.get(public + "/pdf")
    assert issued_pdf.status_code == 200 and issued_pdf.content == pdf.content
    # Fake token with correct tenant prefix cannot read any data.
    assert (await w.client.get(public[:-1] + ("A" if token[-1] != "A" else "B"))).status_code == 404
    response = await w.client.post(
        public + "/decision", json={"decision": "accepted", "name": "Client Name"}
    )
    assert response.status_code == 200
    assert (
        await w.client.post(
            public + "/decision", json={"decision": "declined", "name": "Client Name"}
        )
    ).status_code == 409
    overview = (await w.client.get("/api/v1/crm/overview")).json()
    assert overview["summary"]["collected_minor"] == 0 and overview["summary"]["booked_minor"] == 0
    revision = await proposal(w, lead["id"], revision_of=quote["id"])
    assert revision["version"] == 2 and revision["status"] == "review"
    assert (await w.client.get(public)).status_code == 404


async def test_referral_credit_survives_reassignment_and_cash_is_separate(workspace):
    w = workspace
    lead = await create_lead(w)
    referral = await w.client.post(
        "/api/v1/crm/referrals", json={"lead_id": lead["id"], "referrer": "Original client"}
    )
    assert referral.status_code == 201
    assert (
        await w.client.post(
            "/api/v1/crm/referrals", json={"lead_id": lead["id"], "referrer": "Another source"}
        )
    ).status_code == 409
    w.state["actor"] = w.actors["admin"]
    response = await w.client.post(
        f"/api/v1/crm/leads/{lead['id']}/assign",
        json={"owner_id": str(w.ids["peer"]), "reason": "Territory reassignment"},
    )
    assert response.status_code == 200
    refs = (await w.client.get("/api/v1/crm/referrals")).json()
    assert refs[0]["acquired_by"] == str(w.ids["bde"])
    response = await w.client.post(
        f"/api/v1/crm/leads/{lead['id']}/stage", json={"stage": "converted", "booked_minor": 100000}
    )
    assert response.status_code == 200
    summary = (await w.client.get("/api/v1/crm/overview")).json()["summary"]
    assert summary["booked_minor"] == 100000 and summary["collected_minor"] == 0
    response = await w.client.post(
        "/api/v1/crm/finance",
        json={
            "lead_id": lead["id"],
            "kind": "receipt",
            "amount": 40000,
            "reference": "BANK-001",
            "occurred_at": datetime.now(UTC).isoformat(),
        },
    )
    assert response.status_code == 201
    assert (await w.client.get("/api/v1/crm/overview")).json()["summary"][
        "collected_minor"
    ] == 40000


async def test_opt_out_suppresses_drafts_and_blocks_future_drafts(workspace):
    w = workspace
    lead = await create_lead(w)
    response = await w.client.post(
        "/api/v1/crm/messages",
        json={"lead_id": lead["id"], "body": "A draft", "idempotency_key": str(uuid.uuid4())},
    )
    assert response.status_code == 201 and response.json()["status"] == "draft"
    response = await w.client.post(
        f"/api/v1/crm/leads/{lead['id']}/consent",
        json={
            "status": "opted_out",
            "evidence": "Client requested STOP",
            "purpose": "Marketing outreach",
        },
    )
    assert response.status_code == 200
    messages = (await w.client.get("/api/v1/crm/messages")).json()
    assert messages[0]["status"] == "suppressed"
    response = await w.client.post(
        "/api/v1/crm/messages",
        json={"lead_id": lead["id"], "body": "Another draft", "idempotency_key": str(uuid.uuid4())},
    )
    assert response.json()["status"] == "suppressed"


async def test_database_issued_snapshot_and_referral_attribution_guards(workspace):
    w = workspace
    lead = await create_lead(w)
    quote = await proposal(w, lead["id"])
    async with w.factory() as db:
        await db.execute(
            text("UPDATE crm_proposals SET status='sent' WHERE id=:id"),
            {"id": uuid.UUID(quote["id"])},
        )
        await db.commit()
        with pytest.raises(Exception, match="immutable"):
            await db.execute(
                text("UPDATE crm_proposals SET snapshot='{}' WHERE id=:id"),
                {"id": uuid.UUID(quote["id"])},
            )
        await db.rollback()


async def test_rls_hides_other_tenant_rows_even_without_application_filters(workspace):
    w = workspace
    lead = await create_lead(w)
    async with w.runtime_factory() as db:
        async with tenant_session(db, w.actors["outsider"].agency_id):
            assert not list((await db.execute(select(CRMTask))).scalars())
    async with w.runtime_factory() as db:
        async with tenant_session(db, w.agency):
            assert (await db.execute(select(CRMTask))).scalars().first().lead_id == uuid.UUID(
                lead["id"]
            )


async def test_signed_webhook_replay_optout_and_delivery_order(workspace, monkeypatch):
    from app.config import settings
    from app.models.revenue_crm import CRMMessage

    w = workspace
    lead = await create_lead(w)
    config = {
        "token": "test-token",
        "phone_number_id": "123",
        "business_account_id": "456",
        "app_secret": "test-secret",
        "verify_token": "test-verify",
    }
    monkeypatch.setattr(settings, "CRM_WHATSAPP_CONNECTIONS", {str(w.agency): config})
    draft = (
        await w.client.post(
            "/api/v1/crm/messages",
            json={"lead_id": lead["id"], "body": "Draft", "idempotency_key": str(uuid.uuid4())},
        )
    ).json()
    async with w.factory() as db:
        row = await db.get(CRMMessage, uuid.UUID(draft["id"]))
        row.status, row.provider_id = "sent", "outbound-test-" + str(uuid.uuid4())
        provider_id = row.provider_id
        await db.commit()
    path = f"/api/v1/public/crm/whatsapp/{w.agency}"

    async def webhook(value, valid=True):
        raw = json.dumps(
            {"entry": [{"changes": [{"value": {"metadata": {"phone_number_id": "123"}, **value}}]}]}
        ).encode()
        signature = "sha256=" + hmac.new(b"test-secret", raw, hashlib.sha256).hexdigest()
        return await w.client.post(
            path,
            content=raw,
            headers={
                "X-Hub-Signature-256": signature if valid else "invalid",
                "Content-Type": "application/json",
            },
        )

    assert (await webhook({"statuses": [{"id": provider_id, "status": "read"}]})).status_code == 200
    assert (await webhook({"statuses": [{"id": provider_id, "status": "sent"}]})).status_code == 200
    assert (await w.client.get("/api/v1/crm/messages")).json()[0]["status"] == "read"
    inbound_id = "incoming-test-" + str(uuid.uuid4())
    incoming = {"id": inbound_id, "from": "919876543210", "text": {"body": "STOP"}}
    assert (await webhook({"messages": [incoming]}, valid=False)).status_code == 403
    assert (await webhook({"messages": [incoming, incoming]})).status_code == 200
    assert (await webhook({"messages": [incoming]})).status_code == 200
    messages = (await w.client.get("/api/v1/crm/messages")).json()
    assert len([m for m in messages if m["direction"] == "inbound"]) == 1
    response = await w.client.post(
        "/api/v1/crm/messages",
        json={"lead_id": lead["id"], "body": "Do not send", "idempotency_key": str(uuid.uuid4())},
    )
    assert response.json()["status"] == "suppressed"


async def test_whatsapp_missing_permission_never_calls_provider(workspace, monkeypatch):
    from unittest.mock import AsyncMock
    from app.config import settings
    from app.models.revenue_crm import CRMMessage
    from app.services import crm_whatsapp

    w = workspace
    lead = await create_lead(w)
    draft = (
        await w.client.post(
            "/api/v1/crm/messages",
            json={"lead_id": lead["id"], "body": "Draft", "idempotency_key": str(uuid.uuid4())},
        )
    ).json()
    async with w.factory() as db:
        row = await db.get(CRMMessage, uuid.UUID(draft["id"]))
        row.status, row.scheduled_at = "scheduled", datetime.now(UTC) - timedelta(minutes=1)
        await db.commit()
    monkeypatch.setattr(
        settings,
        "CRM_WHATSAPP_CONNECTIONS",
        {
            str(w.agency): {
                k: "test"
                for k in [
                    "token",
                    "phone_number_id",
                    "business_account_id",
                    "app_secret",
                    "verify_token",
                ]
            }
        },
    )
    monkeypatch.setattr(crm_whatsapp, "async_session_factory", w.runtime_factory)
    provider = AsyncMock()
    monkeypatch.setattr(crm_whatsapp, "templates", provider)
    await crm_whatsapp.execute_message(uuid.UUID(draft["id"]), w.agency)
    provider.assert_not_awaited()
    assert (await w.client.get("/api/v1/crm/messages")).json()[0]["status"] == "suppressed"


async def test_overdue_reminder_is_emitted_once_and_notifies_head(workspace, monkeypatch):
    from sqlalchemy import func
    from app.models.ops import Notification
    from app.services import crm_reminders

    w = workspace
    lead = await create_lead(w)
    async with w.factory() as db:
        task = await db.scalar(select(CRMTask).where(CRMTask.lead_id == uuid.UUID(lead["id"])))
        task.due_at = datetime.now(UTC) - timedelta(hours=1)
        await db.commit()
    monkeypatch.setattr(crm_reminders, "async_session_factory", w.factory)
    await crm_reminders.remind_overdue()
    await crm_reminders.remind_overdue()
    async with w.factory() as db:
        count = await db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.agency_id == w.agency, Notification.title == "CRM follow-up is due")
        )
        assert count == 2  # one owner + one head; no duplicate alert storm


async def test_personal_monthly_targets_are_scoped_and_head_cannot_edit_peer(workspace):
    w = workspace
    month = datetime.now(UTC).strftime("%Y-%m")
    assert (
        await w.client.put(
            "/api/v1/crm/targets",
            json={"user_id": str(w.ids["bde"]), "month": month, "amount": 500000},
        )
    ).status_code == 403
    w.state["actor"] = w.actors["head"]
    assert (
        await w.client.put(
            "/api/v1/crm/targets",
            json={"user_id": str(w.ids["peer"]), "month": month, "amount": 500000},
        )
    ).status_code == 403
    response = await w.client.put(
        "/api/v1/crm/targets", json={"user_id": str(w.ids["bde"]), "month": month, "amount": 500000}
    )
    assert response.status_code == 200, response.text
    w.state["actor"] = w.actors["bde"]
    assert (await w.client.get("/api/v1/crm/overview?month=" + month)).json()["summary"][
        "target_minor"
    ] == 500000
    w.state["actor"] = w.actors["peer"]
    assert (await w.client.get("/api/v1/crm/overview?month=" + month)).json()["summary"][
        "target_minor"
    ] == 0


async def test_discovery_no_provider_never_invents_results_and_review_import_keeps_consent_unknown(
    workspace, monkeypatch
):
    from app.config import settings
    from app.services import crm_discovery
    from unittest.mock import AsyncMock

    w = workspace
    monkeypatch.setattr(settings, "CRM_LEAD_PROVIDER_CONNECTIONS", {})
    response = await w.client.post(
        "/api/v1/crm/discovery/search", json={"query": "Retail brands", "location": "Chennai"}
    )
    assert (
        response.status_code == 409
        and response.json()["error"]["code"] == "DISCOVERY_NOT_CONFIGURED"
    )
    records = [
        crm_discovery.SourceCompany(
            source_id="licensed-1",
            company_name="Licensed Test Brand",
            phone="+919999999999",
            contact_verified=False,
            storage_permitted=True,
        )
    ]
    monkeypatch.setattr(
        crm_discovery, "search", AsyncMock(return_value=(records, "Licensed test provider"))
    )
    response = await w.client.post(
        "/api/v1/crm/discovery/search", json={"query": "Retail brands", "location": "Chennai"}
    )
    assert response.status_code == 200
    source = response.json()["results"][0]
    assert source["phone"] is None
    payload = {
        "review_token": source["review_token"],
        "contact_name": "Buyer to qualify",
        "due_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
    }
    response = await w.client.post("/api/v1/crm/discovery/import", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["metadata_extra"]["discovery"]["source_id"] == "licensed-1"
    assert response.json()["priority"] == "unknown"
    assert (await w.client.post("/api/v1/crm/discovery/import", json=payload)).status_code == 409


async def test_bde_head_cannot_create_accounts_or_change_agency_policy(workspace):
    w = workspace
    w.state["actor"] = w.actors["head"]
    assert (
        await w.client.post(
            "/api/v1/crm/team-admin/accounts",
            json={
                "name": "New BDE",
                "email": "new@example.com",
                "role": "bde",
                "temporary_password": "temporary-12345",
            },
        )
    ).status_code == 403
    assert (await w.client.put("/api/v1/crm/settings", json={})).status_code == 403


async def test_new_crm_accounts_get_agency_and_mandatory_reset(workspace):
    w = workspace
    w.state["actor"] = w.actors["admin"]
    response = await w.client.post(
        "/api/v1/crm/team-admin/accounts",
        json={
            "name": "New BDE Head",
            "email": f"{uuid.uuid4()}@example.com",
            "role": "bde_head",
            "temporary_password": "temporary-12345",
        },
    )
    assert response.status_code == 201, response.text
    async with w.factory() as db:
        user = await db.get(User, uuid.UUID(response.json()["id"]))
        assert (
            user.agency_id == w.agency
            and user.role == UserRole.BDE_HEAD
            and user.must_reset_password
        )


async def test_platform_super_admin_selects_agency_and_bde_cannot_switch(workspace):
    w = workspace
    w.state["actor"] = w.actors["platform"]
    result = await w.client.get("/api/v1/crm/agency-options")
    assert result.status_code == 200, result.text
    assert str(w.agency) in {item["id"] for item in result.json()}
    assert (await w.client.get("/api/v1/crm/overview")).status_code == 403
    result = await w.client.get("/api/v1/crm/overview", headers={"X-CRM-Agency": str(w.agency)})
    assert result.status_code == 200, result.text
    assert (
        await w.client.get("/api/v1/crm/overview", headers={"X-CRM-Agency": "bad"})
    ).status_code == 403
    w.state["actor"] = w.actors["bde"]
    assert (await w.client.get("/api/v1/crm/agency-options")).status_code == 403
    result = await w.client.get(
        "/api/v1/crm/team", headers={"X-CRM-Agency": str(w.actors["outsider"].agency_id)}
    )
    assert result.status_code == 200
    assert {row["id"] for row in result.json()} == {str(w.ids["bde"])}
