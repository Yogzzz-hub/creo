# ruff: noqa: E402 -- Validate disposable database settings before application imports.
"""Real PostgreSQL workflow/locking tests, with mocked Meta and media I/O.

Opt in using TEST_DATABASE_URL pointing to a migrated, disposable localhost
database named creo_test_*. This suite never uses the application's configured DB.
"""

import asyncio
import os
import unittest
import uuid
from contextlib import ExitStack
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from urllib.parse import urlparse

TEST_URL = os.getenv("TEST_DATABASE_URL", "")
if TEST_URL:
    parsed = urlparse(TEST_URL)
    if parsed.hostname not in ("localhost", "127.0.0.1") or not parsed.path.startswith(
        "/creo_test_"
    ):
        raise RuntimeError("TEST_DATABASE_URL must point to a disposable localhost creo_test_* DB")
    os.environ["DATABASE_URL"] = TEST_URL
    os.environ["DIRECT_DATABASE_URL"] = TEST_URL
    os.environ["DB_USE_NULLPOOL"] = "true"

from cryptography.fernet import Fernet
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.core.errors import Conflict, Forbidden
from app.core.rbac import Actor
from app.db.session import current_agency_ctx, is_platform_admin_ctx, tenant_session
from app.models.billing import Plan, Subscription
from app.models.enums import (
    AccountStatus,
    DeliverableStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    TaskStatus,
    UserRole,
)
from app.models.publishing import PublishingJob
from app.models.tenant import Agency
from app.models.user import ClientProfile, User
from app.models.work import Deliverable, Task
from app.services import deliverable_state
from app.services import instagram_connection as connection
from app.services import publishing_service as service
from app.services.instagram_client import InstagramError
from app.workers.tasks import publish, scheduler


@unittest.skipUnless(TEST_URL, "Set TEST_DATABASE_URL to a migrated disposable local DB")
class DatabasePublishingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from sqlalchemy import event

        self.engine = create_async_engine(TEST_URL, poolclass=NullPool)

        @event.listens_for(self.engine.sync_engine, "begin")
        def context(conn):
            conn.execute(
                text(
                    "SELECT set_config('app.current_agency', :agency, true), "
                    "set_config('app.is_platform_admin', :admin, true)"
                ),
                {
                    "agency": current_agency_ctx.get() or "",
                    "admin": "true" if is_platform_admin_ctx.get() else "false",
                },
            )

        self.factory = async_sessionmaker(self.engine, expire_on_commit=False, autoflush=False)
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        for name, value in {
            "ENCRYPTION_KEY": Fernet.generate_key().decode(),
            "INSTAGRAM_APP_ID": "test-app",
            "INSTAGRAM_APP_SECRET": "test-secret",
            "INSTAGRAM_REDIRECT_URI": "https://test.invalid/portal/account/instagram",
            "INSTAGRAM_CLIENT_MODE": "real",
            "INSTAGRAM_PUBLISHING_ENABLED": True,
        }.items():
            self.stack.enter_context(patch.object(settings, name, value))
        self.provider = AsyncMock()
        self.provider.verify_account.return_value = {}
        self.provider.get_content_publishing_limit.return_value = {
            "quota_usage": 0,
            "quota_total": 100,
        }
        self.provider.create_media_container.return_value = "container-1"
        self.provider.get_container_status.return_value = "FINISHED"
        self.provider.publish_container.return_value = {"media_id": "media-1"}
        self.provider.media_permalink.return_value = "https://www.instagram.com/p/test/"
        self.media = ("https://storage.invalid/asset", {"sha256": "a" * 64, "is_video": False})
        for module, name, value in [
            (publish, "async_session_factory", self.factory),
            (scheduler, "async_session_factory", self.factory),
            (publish, "get_instagram_client", lambda: self.provider),
            (connection, "get_instagram_client", lambda: self.provider),
            (publish, "inspect_media", AsyncMock(return_value=self.media)),
        ]:
            self.stack.enter_context(patch.object(module, name, value))
        self.stack.enter_context(
            patch("app.services.instagram_media.inspect_media", AsyncMock(return_value=self.media))
        )
        self.agency_id, self.client_id, self.admin_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        self.d_id, self.task_id = uuid.uuid4(), uuid.uuid4()
        self.client = Actor(
            self.client_id,
            UserRole.CLIENT,
            client_id=self.client_id,
            agency_id=self.agency_id,
            token_version=0,
        )
        self.admin = Actor(self.admin_id, UserRole.ADMIN, agency_id=self.agency_id, token_version=0)
        async with self.factory() as db:
            db.add(
                Agency(
                    id=self.agency_id, name="Test agency", slug=str(self.agency_id), status="active"
                )
            )
            await db.flush()
            for user_id, role in [
                (self.client_id, UserRole.CLIENT),
                (self.admin_id, UserRole.ADMIN),
            ]:
                db.add(
                    User(
                        id=user_id,
                        agency_id=self.agency_id,
                        auth_id=str(user_id),
                        email=f"{user_id}@example.test",
                        full_name="Test user",
                        role=role,
                        account_status=AccountStatus.ACTIVE,
                    )
                )
            plan_id = uuid.uuid4()
            db.add(
                Plan(
                    id=plan_id,
                    agency_id=self.agency_id,
                    name=str(plan_id),
                    display_name="Test",
                    revision_rounds=3,
                )
            )
            await db.flush()
            db.add(
                ClientProfile(
                    user_id=self.client_id,
                    ig_connection_id=uuid.uuid4(),
                    instagram_user_id="ig-original",
                    ig_connection_status="connected",
                    ig_token_encrypted=connection.seal(
                        {"user_token": "secret-user", "page_token": "secret-page"}
                    ),
                    ig_metadata={"page_id": "page-original", "username": "restaurant"},
                )
            )
            db.add(
                Subscription(
                    client_id=self.client_id,
                    agency_id=self.agency_id,
                    plan_id=plan_id,
                    status=SubscriptionStatus.ACTIVE,
                    gateway=PaymentProvider.STRIPE,
                    amount=1,
                    current_period_start=datetime.now(UTC) - timedelta(days=1),
                    current_period_end=datetime.now(UTC) + timedelta(days=30),
                )
            )
            db.add(
                Task(
                    id=self.task_id,
                    agency_id=self.agency_id,
                    client_id=self.client_id,
                    assigned_to=self.admin_id,
                    deliverable_type=DeliverableType.STATIC_POST,
                    status=TaskStatus.CLIENT_REVIEW,
                )
            )
            await db.flush()
            db.add(
                Deliverable(
                    id=self.d_id,
                    root_id=self.d_id,
                    agency_id=self.agency_id,
                    client_id=self.client_id,
                    task_id=self.task_id,
                    file_url="client/version.jpg",
                    file_type="image/jpeg",
                    file_size_bytes=1000,
                    version=1,
                    status=DeliverableStatus.PENDING_APPROVAL,
                    submitted_by=self.admin_id,
                )
            )
            await db.commit()

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def plan(self):
        async with self.factory() as db:
            d = await db.get(Deliverable, self.d_id)
            job = await service.schedule(
                db,
                self.admin,
                d,
                local_time="2099-10-20T18:30",
                timezone="Asia/Kolkata",
                caption="Approved caption",
                media_type="IMAGE",
            )
            self.job_id = job.id
            return job

    async def approve(self, fingerprint=None):
        async with self.factory() as db:
            d = await db.get(Deliverable, self.d_id)
            job = await db.get(PublishingJob, self.job_id)
            await deliverable_state.transition(
                db,
                d,
                DeliverableStatus.APPROVED,
                actor_id=self.client_id,
                actor_role=UserRole.CLIENT,
                publishing_fingerprint=fingerprint
                or service.serialize(job, d)["review_fingerprint"],
            )

    async def due(self):
        async with self.factory() as db:
            job = await db.get(PublishingJob, self.job_id)
            job.scheduled_at = datetime.now(UTC) - timedelta(seconds=10)
            job.next_attempt_at = job.scheduled_at
            await db.commit()

    async def load_job(self):
        async with self.factory() as db:
            return await db.get(PublishingJob, self.job_id)

    async def execute(self):
        return await publish.execute_publish_job(self.job_id, self.agency_id)

    async def test_approval_waits_then_due_job_publishes_once(self):
        self.assertEqual((await self.plan()).status, "pending_approval")
        await self.approve()
        self.assertEqual((await self.load_job()).status, "scheduled")
        self.assertEqual((await self.execute())["status"], "not_due")
        self.provider.publish_container.assert_not_awaited()
        await self.due()
        results = await asyncio.gather(self.execute(), self.execute(), self.execute())
        self.assertIn("published", [r["status"] for r in results])
        self.provider.publish_container.assert_awaited_once_with(
            "ig-original", "container-1", "secret-page"
        )
        await self.execute()
        self.provider.publish_container.assert_awaited_once()
        job = await self.load_job()
        self.assertEqual(job.media_id, "media-1")
        self.assertEqual(job.stage, "confirmed")
        async with self.factory() as db:
            self.assertEqual(
                (await db.get(Deliverable, self.d_id)).status, DeliverableStatus.APPROVED
            )

    async def test_publish_timeout_never_retries_submission(self):
        await self.plan()
        await self.approve()
        await self.due()
        self.provider.publish_container.side_effect = InstagramError("No response", ambiguous=True)
        self.assertEqual((await self.execute())["status"], "uncertain")
        self.provider.get_container_status.return_value = "PUBLISHED"
        self.assertEqual((await self.execute())["status"], "published")
        self.provider.publish_container.assert_awaited_once()
        self.assertEqual((await self.load_job()).stage, "confirmed_container")

    async def test_definite_publish_rejection_can_fail_safely(self):
        await self.plan()
        await self.approve()
        await self.due()
        self.provider.publish_container.side_effect = InstagramError(
            "Unsupported media", "META_REJECTED"
        )
        self.assertEqual((await self.execute())["status"], "failed")
        self.assertEqual((await self.load_job()).stage, "container")
        self.provider.publish_container.assert_awaited_once()

    async def test_oauth_expired_state_and_unauthorized_selection_are_rejected(self):
        from app.models.publishing import InstagramOAuth

        async with self.factory() as db:
            start = await connection.start(db, self.client)
            flow = (
                await db.execute(
                    select(InstagramOAuth).where(InstagramOAuth.client_id == self.client_id)
                )
            ).scalar_one()
            flow.expires_at = datetime.now(UTC) - timedelta(seconds=1)
            await db.commit()
        async with self.factory() as db:
            with self.assertRaises(Forbidden):
                await connection.callback(
                    db,
                    self.client,
                    state=start["state"],
                    verifier=start["verifier"],
                    code="code",
                    denied=False,
                )
        async with self.factory() as db:
            with self.assertRaises(Forbidden):
                await connection.select_account(db, self.client, uuid.uuid4(), "unapproved-account")
        self.provider.discover_accounts.assert_not_awaited()

    async def test_restart_after_submitting_only_reconciles(self):
        await self.plan()
        await self.approve()
        await self.due()
        async with self.factory() as db:
            job = await db.get(PublishingJob, self.job_id)
            job.status, job.stage, job.container_id = "processing", "submitting", "container-1"
            job.lease_until = datetime.now(UTC) - timedelta(minutes=1)
            await db.commit()
        self.provider.get_container_status.return_value = "PUBLISHED"
        self.assertEqual((await self.execute())["status"], "published")
        self.provider.publish_container.assert_not_awaited()

    async def test_processing_poll_reuses_container(self):
        await self.plan()
        await self.approve()
        await self.due()
        self.provider.get_container_status.return_value = "IN_PROGRESS"
        self.assertEqual((await self.execute())["status"], "processing")
        self.provider.publish_container.assert_not_awaited()
        await self.due()
        self.provider.get_container_status.return_value = "FINISHED"
        self.assertEqual((await self.execute())["status"], "published")
        self.provider.create_media_container.assert_awaited_once()

    async def test_transient_retry_and_retry_limit(self):
        await self.plan()
        await self.approve()
        await self.due()
        self.provider.verify_account.side_effect = InstagramError("Rate limit", retryable=True)
        for attempt in range(1, 6):
            await self.due()
            result = await self.execute()
            self.assertEqual(result["status"], "scheduled" if attempt < 5 else "failed")
            self.assertEqual((await self.load_job()).attempts, attempt)
        self.provider.publish_container.assert_not_awaited()

    async def test_feature_flag_and_wrong_agency_are_safe(self):
        await self.plan()
        await self.approve()
        await self.due()
        with patch.object(settings, "INSTAGRAM_PUBLISHING_ENABLED", False):
            self.assertEqual((await self.execute())["status"], "disabled")
        self.assertEqual(
            (await publish.execute_publish_job(self.job_id, uuid.uuid4()))["status"], "not_found"
        )
        self.provider.publish_container.assert_not_awaited()

    async def test_mutated_file_is_blocked_before_container_creation(self):
        await self.plan()
        await self.approve()
        await self.due()
        with patch.object(
            publish,
            "inspect_media",
            AsyncMock(return_value=(self.media[0], {"sha256": "changed", "is_video": False})),
        ):
            self.assertEqual((await self.execute())["status"], "failed")
        self.assertEqual((await self.load_job()).error_code, "MEDIA_CHANGED")
        self.provider.create_media_container.assert_not_awaited()

    async def test_caption_edit_requires_fresh_approval(self):
        await self.plan()
        await self.approve()
        async with self.factory() as db:
            d = await db.get(Deliverable, self.d_id)
            job = await db.get(PublishingJob, self.job_id)
            stale = service.serialize(job, d)["review_fingerprint"]
            await service.schedule(
                db,
                self.admin,
                d,
                local_time="2099-10-21T18:30",
                timezone="Asia/Kolkata",
                caption="New caption",
                media_type="IMAGE",
            )
        self.assertEqual((await self.load_job()).status, "pending_approval")
        async with self.factory() as db:
            with self.assertRaises(Conflict):
                await service.approve_publication(
                    db, self.client, await db.get(Deliverable, self.d_id), stale
                )

    async def test_rejection_cancels_version(self):
        await self.plan()
        async with self.factory() as db:
            await deliverable_state.transition(
                db,
                await db.get(Deliverable, self.d_id),
                DeliverableStatus.REVISION_REQUESTED,
                actor_id=self.client_id,
                actor_role=UserRole.CLIENT,
                reason="Change image",
            )
        self.assertEqual((await self.load_job()).status, "canceled")
        self.provider.publish_container.assert_not_awaited()

    async def test_legacy_approval_does_not_enroll_content(self):
        async with self.factory() as db:
            await deliverable_state.transition(
                db,
                await db.get(Deliverable, self.d_id),
                DeliverableStatus.APPROVED,
                actor_id=self.client_id,
                actor_role=UserRole.CLIENT,
            )
            self.assertIsNone(
                (
                    await db.execute(
                        select(PublishingJob).where(PublishingJob.deliverable_id == self.d_id)
                    )
                ).scalar_one_or_none()
            )

    async def test_disconnect_pauses_job_and_erases_credentials(self):
        await self.plan()
        await self.approve()
        async with self.factory() as db:
            result = await connection.disconnect(db, self.client)
            self.assertEqual(result["status"], "disconnected")
            self.assertIsNone((await db.get(ClientProfile, self.client_id)).ig_token_encrypted)
        self.assertEqual((await self.load_job()).status, "paused")
        self.provider.revoke.assert_awaited_once()

    async def test_inactive_subscription_blocks_worker(self):
        await self.plan()
        await self.approve()
        await self.due()
        async with self.factory() as db:
            sub = (
                await db.execute(
                    select(Subscription).where(Subscription.client_id == self.client_id)
                )
            ).scalar_one()
            sub.current_period_end = datetime.now(UTC) - timedelta(days=1)
            await db.commit()
        self.assertEqual((await self.execute())["status"], "failed")
        self.assertEqual((await self.load_job()).error_code, "SUBSCRIPTION_INACTIVE")

    async def test_client_cannot_schedule_and_admin_cannot_connect(self):
        async with self.factory() as db:
            with self.assertRaises(Forbidden):
                await service.schedule(
                    db,
                    self.client,
                    await db.get(Deliverable, self.d_id),
                    local_time="2099-10-20T18:30",
                    timezone="UTC",
                    caption="",
                    media_type="IMAGE",
                )
            with self.assertRaises(Forbidden):
                await connection.start(db, self.admin)

    async def test_oauth_state_binding_single_use_and_encrypted_selection(self):
        async with self.factory() as db:
            start = await connection.start(db, self.client)
        async with self.factory() as db:
            with self.assertRaises(Forbidden):
                await connection.callback(
                    db,
                    self.client,
                    state=start["state"],
                    verifier="wrong",
                    code="code",
                    denied=False,
                )
        self.provider.discover_accounts.return_value = [
            {
                "id": "ig-a",
                "username": "a",
                "page_id": "page-a",
                "page_name": "A",
                "page_token": "private",
                "user_token": "private",
            },
            {
                "id": "ig-b",
                "username": "b",
                "page_id": "page-b",
                "page_name": "B",
                "page_token": "private",
                "user_token": "private",
            },
        ]
        async with self.factory() as db:
            result = await connection.callback(
                db,
                self.client,
                state=start["state"],
                verifier=start["verifier"],
                code="code",
                denied=False,
            )
        self.assertEqual(len(result["accounts"]), 2)
        self.assertNotIn("private", str(result))
        async with self.factory() as db:
            with self.assertRaises(Forbidden):
                await connection.callback(
                    db,
                    self.client,
                    state=start["state"],
                    verifier=start["verifier"],
                    code="code",
                    denied=False,
                )
        async with self.factory() as db:
            selected = await connection.select_account(
                db, self.client, uuid.UUID(result["selection_id"]), "ig-b"
            )
        self.assertEqual(selected["account_id"], "ig-b")
        self.assertNotIn("private", str(selected))

    async def test_oauth_denial_preserves_existing_connection(self):
        async with self.factory() as db:
            start = await connection.start(db, self.client)
        async with self.factory() as db:
            with self.assertRaises(Conflict):
                await connection.callback(
                    db,
                    self.client,
                    state=start["state"],
                    verifier=start["verifier"],
                    code=None,
                    denied=True,
                )
            self.assertEqual(
                (await db.get(ClientProfile, self.client_id)).instagram_user_id, "ig-original"
            )
        self.provider.discover_accounts.assert_not_awaited()

    async def test_database_rls_hides_other_agency_jobs(self):
        await self.plan()
        async with self.factory() as db:
            if not (
                await db.execute(text("SELECT 1 FROM pg_roles WHERE rolname='creo_test_reader'"))
            ).scalar():
                await db.execute(text("CREATE ROLE creo_test_reader NOLOGIN"))
            await db.execute(text("GRANT USAGE ON SCHEMA public TO creo_test_reader"))
            await db.execute(text("GRANT SELECT ON publishing_jobs TO creo_test_reader"))
            await db.commit()
        async with self.factory() as db:
            async with tenant_session(db, agency_id=uuid.uuid4()):
                await db.execute(text("SET LOCAL ROLE creo_test_reader"))
                self.assertEqual(
                    (await db.execute(select(PublishingJob).where(PublishingJob.id == self.job_id)))
                    .scalars()
                    .all(),
                    [],
                )
        async with self.factory() as db:
            async with tenant_session(db, agency_id=self.agency_id):
                await db.execute(text("SET LOCAL ROLE creo_test_reader"))
                self.assertIsNotNone(
                    (
                        await db.execute(
                            select(PublishingJob).where(PublishingJob.id == self.job_id)
                        )
                    ).scalar_one()
                )

    async def test_queue_uses_scoped_client_names(self):
        await self.plan()
        async with self.factory() as db:
            rows = await service.scoped_jobs(db, self.client)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["client_name"], "Test user")
            self.assertNotIn("secret-page", str(rows))

    async def test_broker_failure_leaves_job_recoverable(self):
        await self.plan()
        await self.approve()
        await self.due()
        with patch.object(
            scheduler, "_get_active_agencies", AsyncMock(return_value=[self.agency_id])
        ):
            with patch.object(publish.publish_deliverable_task, "apply_async", side_effect=OSError):
                self.assertEqual(await scheduler.dispatch_due_publishes_async(), [])
            self.assertEqual((await self.load_job()).status, "scheduled")
            with patch.object(publish.publish_deliverable_task, "apply_async") as enqueue:
                self.assertEqual(await scheduler.dispatch_due_publishes_async(), [self.job_id])
                enqueue.assert_called_once()

    async def test_missed_schedule_requires_new_future_time(self):
        await self.plan()
        await self.approve()
        async with self.factory() as db:
            job = await db.get(PublishingJob, self.job_id)
            job.scheduled_at = datetime.now(UTC) - timedelta(days=1)
            job.next_attempt_at = job.scheduled_at
            await db.commit()
        self.assertEqual((await self.execute())["status"], "needs_schedule")
        self.provider.publish_container.assert_not_awaited()

    async def test_time_only_reschedule_preserves_exact_approval(self):
        await self.plan()
        await self.approve()
        original = (await self.load_job()).approved_fingerprint
        async with self.factory() as db:
            await service.schedule(
                db,
                self.admin,
                await db.get(Deliverable, self.d_id),
                local_time="2099-10-22T18:30",
                timezone="Asia/Kolkata",
                caption="Approved caption",
                media_type="IMAGE",
            )
        self.assertEqual((await self.load_job()).approved_fingerprint, original)
        self.assertEqual((await self.load_job()).status, "scheduled")

    async def test_revoked_authorization_pauses_before_submission(self):
        await self.plan()
        await self.approve()
        await self.due()
        self.provider.verify_account.side_effect = InstagramError("Reconnect", reconnect=True)
        self.assertEqual((await self.execute())["status"], "paused")
        self.provider.publish_container.assert_not_awaited()
        async with self.factory() as db:
            self.assertEqual(
                (await db.get(ClientProfile, self.client_id)).ig_connection_status,
                "reconnect_required",
            )

    async def test_connection_replacement_cannot_change_publish_destination(self):
        await self.plan()
        await self.approve()
        await self.due()
        async with self.factory() as db:
            profile = await db.get(ClientProfile, self.client_id)
            profile.ig_connection_id = uuid.uuid4()
            profile.instagram_user_id = "different-instagram"
            await db.commit()
        self.assertEqual((await self.execute())["status"], "paused")
        self.provider.publish_container.assert_not_awaited()

    async def test_enrolled_version_cannot_be_manually_marked_published(self):
        await self.plan()
        await self.approve()
        async with self.factory() as db:
            with self.assertRaises(Conflict):
                await deliverable_state.transition(
                    db,
                    await db.get(Deliverable, self.d_id),
                    DeliverableStatus.PUBLISHED,
                    actor_id=self.admin_id,
                    actor_role=UserRole.ADMIN,
                )

    async def test_assignment_and_agency_isolation(self):
        from app.models.user import StaffProfile
        from app.models.work import ClientAssignment

        other_client, creative, lead, stranger, foreign = [uuid.uuid4() for _ in range(5)]
        other_agency = uuid.uuid4()
        async with self.factory() as db:
            db.add(Agency(id=other_agency, name="Other", slug=str(other_agency)))
            await db.flush()
            for uid, role in [
                (other_client, UserRole.CLIENT),
                (creative, UserRole.DESIGNER),
                (lead, UserRole.TEAM_LEAD),
                (stranger, UserRole.DESIGNER),
                (foreign, UserRole.ADMIN),
            ]:
                db.add(
                    User(
                        id=uid,
                        agency_id=other_agency if uid == foreign else self.agency_id,
                        auth_id=str(uid),
                        email=f"{uid}@test.invalid",
                        role=role,
                        account_status=AccountStatus.ACTIVE,
                    )
                )
            await db.flush()
            db.add(StaffProfile(user_id=creative, team_lead_id=lead))
            db.add(
                ClientAssignment(client_id=self.client_id, user_id=creative, role=UserRole.DESIGNER)
            )
            await db.commit()
        async with self.factory() as db:
            d = await db.get(Deliverable, self.d_id)
            for uid, role, agency in [
                (other_client, UserRole.CLIENT, self.agency_id),
                (stranger, UserRole.DESIGNER, self.agency_id),
                (foreign, UserRole.ADMIN, other_agency),
            ]:
                with self.assertRaises(Forbidden):
                    await service.access(db, Actor(uid, role, agency_id=agency), d)
            for uid, role in [(creative, UserRole.DESIGNER), (lead, UserRole.TEAM_LEAD)]:
                await service.access(db, Actor(uid, role, agency_id=self.agency_id), d, write=True)

    async def test_database_rejects_mismatched_job_owner(self):
        from sqlalchemy.exc import DBAPIError

        async with self.factory() as db:
            db.add(
                PublishingJob(
                    agency_id=self.agency_id,
                    client_id=self.admin_id,
                    deliverable_id=self.d_id,
                    caption="",
                    media_type="IMAGE",
                )
            )
            with self.assertRaises(DBAPIError):
                await db.flush()
            await db.rollback()

    async def test_database_rejects_unapproved_or_unhashed_scheduled_job(self):
        from sqlalchemy.exc import DBAPIError

        await self.plan()
        async with self.factory() as db:
            job = await db.get(PublishingJob, self.job_id)
            job.status = "scheduled"
            job.scheduled_at = datetime.now(UTC) + timedelta(days=1)
            job.approved_fingerprint = "a" * 64
            job.connection_id = uuid.uuid4()
            job.instagram_account_id = "ig-original"
            job.media_metadata = {"sha256": "a" * 64}
            with self.assertRaises(DBAPIError):
                await db.flush()
            await db.rollback()

    async def test_api_shapes_and_client_schedule_forbidden(self):
        import httpx

        from app.core.rbac import get_current_actor
        from app.db.session import get_db
        from app.main import app

        async def database():
            async with self.factory() as db:
                yield db

        overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_current_actor] = lambda: self.client
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.get("/api/v1/portal/integrations/instagram")
                self.assertEqual(response.status_code, 200)
                self.assertNotIn("secret-page", response.text)
                response = await client.post(
                    f"/api/v1/deliverables/{self.d_id}/schedule",
                    json={
                        "local_time": "2099-01-01T12:00",
                        "timezone": "UTC",
                        "media_type": "IMAGE",
                    },
                )
                self.assertEqual(response.status_code, 403)
                response = await client.get(f"/api/v1/publishing/deliverables/{self.d_id}")
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.json()["can_manage"])
                response = await client.get(
                    f"/api/v1/publishing/clients/{self.client_id}/connection"
                )
                self.assertEqual(response.status_code, 403)
                app.dependency_overrides[get_current_actor] = lambda: self.admin
                response = await client.get(
                    f"/api/v1/publishing/clients/{self.client_id}/connection"
                )
                self.assertEqual(response.status_code, 200)
                self.assertNotIn("secret-page", response.text)
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(overrides)


if __name__ == "__main__":
    unittest.main()
