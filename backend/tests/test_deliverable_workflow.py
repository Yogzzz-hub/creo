"""Creative upload → lead QA → client review (App Flow 5.1 steps 13-15, 5.2 and 5.5).

The rule tests always run. The end-to-end API test needs a migrated PostgreSQL
database named explicitly in CREO_TEST_DATABASE_URL; it never falls back to
DATABASE_URL, which may point at a shared or production database. Everything it
writes is rolled back.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.enums import DeliverableStatus, DeliverableType, TaskStatus, UserRole
from app.models.work import Deliverable, Task
from app.services import deliverable_workflow as workflow
from app.services import storage_service
from app.services.deliverable_state import ALLOWED_ACTORS, TRANSITIONS

TEST_DB_URL = os.environ.get("CREO_TEST_DATABASE_URL")


# ── Rules ────────────────────────────────────────────────────────────────────


def test_revision_clock_counts_business_hours_only():
    friday_evening = datetime(2026, 10, 9, 18, 0, tzinfo=UTC)
    assert workflow.add_business_hours(friday_evening, 24) == datetime(2026, 10, 12, 18, 0, tzinfo=UTC)
    saturday = datetime(2026, 10, 10, 9, 0, tzinfo=UTC)
    assert workflow.add_business_hours(saturday, 24) == datetime(2026, 10, 13, 0, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("mime", "size", "accepted"),
    [
        ("image/png", 10 * 1024 * 1024, True),
        ("image/png", 10 * 1024 * 1024 + 1, False),
        ("video/mp4", 400 * 1024 * 1024, True),
        ("video/mp4", 501 * 1024 * 1024, False),
        ("image/gif", 1024, True),
        ("application/pdf", 1024, False),
        ("video/mp4", 0, False),
    ],
)
def test_upload_limits_follow_app_flow(mime, size, accepted):
    if accepted:
        storage_service.validate_media(mime, size)
    else:
        with pytest.raises(storage_service.StorageError):
            storage_service.validate_media(mime, size)


def test_media_urls_load_from_the_frontend_origin():
    request = SimpleNamespace(
        headers={"x-forwarded-proto": "https", "host": "api.example.com"},
        url=SimpleNamespace(scheme="http", netloc="internal:8000"),
    )
    local = storage_service.resolve_media_url("/static/uploads/a.mp4", request)
    assert local == "https://api.example.com/static/uploads/a.mp4"
    # The old task board stored "uploaded://<name>" without uploading anything.
    assert storage_service.resolve_media_url("uploaded://draft.mov", request) is None
    assert storage_service.resolve_media_url("https://cdn.example.com/x.png") == "https://cdn.example.com/x.png"


def _deliverable(status: DeliverableStatus, comment: str | None = None) -> Deliverable:
    return Deliverable(
        id=uuid.uuid4(), root_id=uuid.uuid4(), version=2, client_id=uuid.uuid4(),
        file_url="clients/c/2026/10/a.mp4", file_type="video/mp4", file_size_bytes=10,
        status=status, revision_round=1, rejection_comment=comment,
    )


def test_client_payload_hides_internal_notes_and_unlocks_download_on_approval(monkeypatch):
    monkeypatch.setattr(
        storage_service, "signed_get",
        lambda key, **kw: f"https://signed/{key}?dl={kw.get('download_filename')}",
    )
    task = Task(id=uuid.uuid4(), client_id=uuid.uuid4(), deliverable_type=DeliverableType.REEL,
                blueprint={"concept_name": "Launch teaser"})

    pending = workflow.serialize_for_client(_deliverable(DeliverableStatus.PENDING_APPROVAL, "QA: fix audio"), task)
    assert pending["rejection_comment"] is None
    assert pending["download_url"] is None
    assert pending["title"] == "Launch teaser"
    assert pending["is_video"] is True

    approved = workflow.serialize_for_client(_deliverable(DeliverableStatus.APPROVED), task)
    assert approved["download_url"].endswith("dl=Creo_Launch_teaser_v2.mp4")

    revision = workflow.serialize_for_client(_deliverable(DeliverableStatus.REVISION_REQUESTED, "Stronger hook"), task)
    assert revision["rejection_comment"] == "Stronger hook"
    assert revision["status_label"] == "Revision in progress"


def test_only_unseen_internal_drafts_can_be_superseded_by_an_upload():
    for status in (DeliverableStatus.PENDING_QA, DeliverableStatus.QA_REJECTED):
        assert DeliverableStatus.ARCHIVED in TRANSITIONS[status]
        assert UserRole.EDITOR in ALLOWED_ACTORS[(status, DeliverableStatus.ARCHIVED)]
    assert DeliverableStatus.ARCHIVED not in TRANSITIONS[DeliverableStatus.PENDING_APPROVAL]
    assert workflow.CLIENT_VISIBLE_STATUSES.isdisjoint({
        DeliverableStatus.IN_PRODUCTION, DeliverableStatus.PENDING_QA,
        DeliverableStatus.QA_REJECTED, DeliverableStatus.ARCHIVED,
    })


# ── End-to-end through the API (real PostgreSQL) ─────────────────────────────

needs_db = pytest.mark.skipif(not TEST_DB_URL, reason="set CREO_TEST_DATABASE_URL to a migrated test database")


@pytest.fixture
async def db_session():
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    async with engine.connect() as conn:
        outer = await conn.begin()
        session = AsyncSession(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await outer.rollback()
    await engine.dispose()


async def _seed(db):
    from app.models.billing import Plan, Subscription
    from app.models.enums import AccountStatus, PaymentProvider, SubscriptionStatus
    from app.models.tenant import Agency
    from app.models.user import ClientProfile, StaffProfile, User
    from app.models.work import ClientAssignment, ContentCalendar

    tag = uuid.uuid4().hex[:8]
    now = datetime.now(UTC)
    agency = Agency(id=uuid.uuid4(), name="Workflow Agency", slug=f"workflow-{tag}")
    plan = Plan(id=uuid.uuid4(), name=f"wf-{tag}", display_name="Growth", revision_rounds=1)
    db.add_all([agency, plan])
    await db.flush()

    def person(role: UserRole, name: str) -> User:
        return User(id=uuid.uuid4(), agency_id=agency.id, auth_id=f"{name}-{tag}", email=f"{name}-{tag}@example.com",
                    full_name=name.title(), role=role, account_status=AccountStatus.ACTIVE)

    client, other_client = person(UserRole.CLIENT, "client"), person(UserRole.CLIENT, "other")
    lead, editor, stranger = person(UserRole.TEAM_LEAD, "lead"), person(UserRole.EDITOR, "editor"), person(UserRole.EDITOR, "stranger")
    db.add_all([client, other_client, lead, editor, stranger])
    await db.flush()
    db.add_all([
        ClientProfile(user_id=client.id, company_name="Bloom Bakery",
                      brand_dna={"positioning": "x"}, terms_accepted_at=now, onboarding_completed_at=now),
        StaffProfile(user_id=editor.id, agency_id=agency.id, team_lead_id=lead.id),
        Subscription(client_id=client.id, plan_id=plan.id, agency_id=agency.id, status=SubscriptionStatus.ACTIVE,
                     gateway=PaymentProvider.MANUAL, amount=Decimal("1.00"),
                     current_period_start=now - timedelta(days=1), current_period_end=now + timedelta(days=29)),
        ClientAssignment(agency_id=agency.id, client_id=client.id, user_id=lead.id, role="team_lead", craft_role="team_lead"),
        ClientAssignment(agency_id=agency.id, client_id=client.id, user_id=editor.id, role="video_editor", craft_role="video_editor"),
        ContentCalendar(agency_id=agency.id, client_id=client.id, publish_date=date.today()),
    ])
    task = Task(id=uuid.uuid4(), agency_id=agency.id, client_id=client.id, deliverable_type=DeliverableType.REEL,
                status=TaskStatus.BACKLOG, assigned_to=editor.id, blueprint={"concept_name": "Launch teaser"})
    db.add(task)
    await db.commit()
    return SimpleNamespace(client=client, other_client=other_client, lead=lead, editor=editor,
                           stranger=stranger, task=task)


def _as(user) -> dict[str, str]:
    return {"X-User-Id": str(user.id), "X-User-Role": user.role.value}


@needs_db
async def test_upload_qa_and_client_review_follow_the_app_flow(db_session, monkeypatch, tmp_path):
    import httpx
    from sqlalchemy import select

    from app.db.session import get_db
    from app.main import app
    from app.models.ops import Notification

    monkeypatch.setattr(storage_service, "_is_s3_configured", lambda: False)
    monkeypatch.setattr(storage_service, "_is_supabase_configured", lambda: False)
    monkeypatch.setattr(storage_service, "_LOCAL_STATIC_DIR", str(tmp_path))
    emails: list[dict[str, str]] = []

    async def record_email(**kwargs):
        emails.append(kwargs)

    monkeypatch.setattr(workflow, "send_ready_for_review_email", record_email)

    async def use_test_session():
        yield db_session

    app.dependency_overrides[get_db] = use_test_session
    s = await _seed(db_session)
    task_id = s.task.id

    async def notes_for(user) -> list[Notification]:
        return list((await db_session.execute(
            select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at)
        )).scalars().all())

    async def upload(user, name: str):
        return await api.post(
            f"/api/v1/deliverables/tasks/{task_id}/upload", headers=_as(user),
            files={"file": (name, b"\x00\x00\x00\x18ftypmp42" + b"0" * 64, "video/mp4")},
            data={"notes": "Cut to beat"},
        )

    async def portal(user=None):
        res = await api.get("/api/v1/portal/deliverables", headers=_as(user or s.client))
        assert res.status_code == 200, res.text
        return res.json()

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="https://api.test") as api:
            # Journey 5 step 4: the assigned creative starts the task; nobody else can work it.
            res = await api.post(f"/api/v1/deliverables/tasks/{task_id}/start", headers=_as(s.editor))
            assert res.json()["status"] == "in_production"
            assert (await upload(s.stranger, "x.mp4")).status_code == 403

            # Step 5: the file is stored and enters internal QA, invisible to the client.
            res = await upload(s.editor, "teaser.mp4")
            assert res.status_code == 200, res.text
            v1 = res.json()
            assert (v1["status"], v1["version"]) == ("pending_qa", 1)
            assert v1["file_url"].startswith("https://api.test/static/uploads/clients/")
            assert (await portal())["items"] == []
            assert any("QA review needed" in n.title for n in await notes_for(s.lead))

            # Lead sends it back: notes required, creative notified, client still sees nothing.
            assert (await api.post(f"/api/v1/deliverables/{v1['id']}/qa-reject", headers=_as(s.lead))).status_code == 409
            res = await api.post(f"/api/v1/deliverables/{v1['id']}/qa-reject", headers=_as(s.lead),
                                 json={"notes": "Audio clips at 0:04"})
            assert res.json()["status"] == "qa_rejected"
            assert any(n.message == "Audio clips at 0:04" for n in await notes_for(s.editor))
            assert (await portal())["items"] == []

            # The fix supersedes the rejected draft as v2 of the same deliverable.
            v2 = (await upload(s.editor, "teaser-fixed.mp4")).json()
            assert (v2["version"], v2["root_id"]) == (2, v1["root_id"])
            assert (await db_session.get(Deliverable, uuid.UUID(v1["id"]))).status == DeliverableStatus.ARCHIVED

            # Journey 1 step 14: QA approval notifies the client in-portal and by email.
            res = await api.post(f"/api/v1/deliverables/{v2['id']}/qa-approve", headers=_as(s.lead))
            assert res.json()["status"] == "pending_approval"
            client_notes = await notes_for(s.client)
            assert client_notes[-1].link == f"/portal/deliverables/{v2['id']}"
            assert emails and emails[-1]["link"].endswith(f"/portal/deliverables/{v2['id']}")

            listing = await portal()
            assert listing["waiting_on_you"] == 1
            card = listing["items"][0]
            assert (card["id"], card["status"], card["title"]) == (v2["id"], "pending_approval", "Launch teaser")
            assert card["is_video"] and card["file_url"] and card["download_url"] is None
            assert card["rejection_comment"] is None  # internal QA note never reaches the client
            other = await api.get(f"/api/v1/portal/deliverables/{v2['id']}", headers=_as(s.other_client))
            assert other.status_code == 404

            # Journey 2: rejection needs a comment, starts the 24-business-hour clock.
            assert (await api.post(f"/api/v1/deliverables/{v2['id']}/request-changes", headers=_as(s.client),
                                   json={"rejection_comment": " "})).status_code in (409, 422)
            res = await api.post(f"/api/v1/deliverables/{v2['id']}/request-changes", headers=_as(s.client),
                                 json={"rejection_comment": "Stronger hook in the first second"})
            assert res.json()["status"] == "revision_requested"
            task = await db_session.get(Task, task_id)
            await db_session.refresh(task)
            assert task.is_revision and task.status == TaskStatus.IN_PRODUCTION and task.sla_due_at
            assert any("Revision requested" in n.title for n in await notes_for(s.editor))
            assert (await api.post(f"/api/v1/deliverables/tasks/{task_id}/upload", headers=_as(s.client),
                                   files={"file": ("x.mp4", b"0", "video/mp4")})).status_code == 403

            # While the revision is in internal QA the client still sees "Revision in progress".
            v3 = (await upload(s.editor, "teaser-v3.mp4")).json()
            card = (await portal())["items"][0]
            assert (card["id"], card["status_label"]) == (v2["id"], "Revision in progress")
            assert card["rejection_comment"] == "Stronger hook in the first second"

            # QA approval of the revision replaces the card; history shows only reviewed versions.
            await api.post(f"/api/v1/deliverables/{v3['id']}/qa-approve", headers=_as(s.lead))
            card = (await portal())["items"][0]
            assert (card["id"], card["version"], card["status"]) == (v3["id"], 3, "pending_approval")
            detail = (await api.get(f"/api/v1/portal/deliverables/{v3['id']}", headers=_as(s.client))).json()
            assert [v["version"] for v in detail["versions"]] == [3, 2]

            # The plan includes one revision round, already used.
            res = await api.post(f"/api/v1/deliverables/{v3['id']}/request-changes", headers=_as(s.client),
                                 json={"rejection_comment": "One more tweak"})
            assert res.status_code == 409 and res.json()["error"]["code"] == "REVISION_LIMIT_REACHED"

            # Journey 1 step 15: approval unlocks the download and completes the task.
            res = await api.post(f"/api/v1/deliverables/{v3['id']}/approve", headers=_as(s.client))
            assert res.json()["status"] == "approved"
            card = (await portal())["items"][0]
            assert card["download_url"] and card["status"] == "approved"
            await db_session.refresh(task)
            assert task.status == TaskStatus.READY_TO_PUBLISH
            assert any("Client approved" in n.title for n in await notes_for(s.editor))
            res = await upload(s.editor, "late.mp4")
            assert res.status_code == 409
    finally:
        app.dependency_overrides.pop(get_db, None)
