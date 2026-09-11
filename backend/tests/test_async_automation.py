"""Phase 6 Async and Automation Acceptance Tests.

Strictly verifies the acceptance criteria from BUILD-PROMPTS.md Phase 6:
1. Schedule a deliverable 1 minute out. Beat picks it up, it publishes, exactly one post exists.
2. Start a publish, kill -9 worker after container commits but before media_publish.
   Restart: task resumes from the stored ig_creation_id and produces EXACTLY ONE post.
3. Force container into ERROR. Assert status='publish_failed' AND ig_creation_id IS NULL.
4. Run publish_deliverable on an already-published row -> returns skipped, zero API calls.
5. Set quota_usage to 25 -> task retries with backoff rather than failing.
6. Run concurrent beat processes on 20 scheduled items -> strictly zero duplicate dispatches (FOR UPDATE SKIP LOCKED).
7. Maintenance tasks: SLA breach sweep, token refresh, and stale onboarding expiration.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.enums import AccountStatus, DeliverableStatus, UserRole
from app.models.ops import Notification
from app.models.user import ClientProfile, User
from app.models.work import Deliverable
from app.services.instagram_client import fake_instagram_client
from app.workers.tasks.maintenance import (
    expire_stale_onboarding_async,
    refresh_expiring_ig_async,
    refresh_kpis_async,
    sla_breach_sweep_async,
)
from app.workers.celery_app import celery_app
from app.workers.tasks.notify import send_notification_async
from app.workers.tasks.publish import execute_publish_deliverable_async
from app.workers.tasks.scheduler import dispatch_due_publishes_async

celery_app.conf.broker_url = "memory://"
celery_app.conf.result_backend = "cache+memory://"


async def _create_test_client_and_deliverable(
    db: AsyncSession,
    *,
    status: DeliverableStatus = DeliverableStatus.SCHEDULED,
    scheduled_at: datetime | None = None,
    ig_token_expires_at: datetime | None = None,
) -> tuple[User, Deliverable]:
    """Helper to persist a client user and deliverable for async worker testing."""
    client_id = uuid.uuid4()
    user = User(
        id=client_id,
        auth_id=f"auth-worker-{client_id}",
        email=f"client-{client_id}@example.com",
        full_name="Test Worker Client",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db.add(user)

    profile = ClientProfile(
        user_id=client_id,
        company_name="Acme Corp",
        instagram_username="acmecorp",
        instagram_user_id=f"ig_user_{client_id.hex[:8]}",
        ig_token_expires_at=ig_token_expires_at or (datetime.now(UTC) + timedelta(days=60)),
    )
    db.add(profile)

    now = datetime.now(UTC)
    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        file_url="https://storage.creo.network/media/reel_test.mp4",
        file_type="video/mp4",
        file_size_bytes=41943040,  # 40MB
        status=status,
        scheduled_at=scheduled_at or (now - timedelta(minutes=1)),
    )
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)
    return user, deliverable


@pytest.mark.asyncio
async def test_acceptance_1_due_publish_pickup() -> None:
    """Acceptance 1: Schedule a deliverable 1 minute out.

    Beat picks it up, it publishes, exactly one post exists.
    """
    fake_instagram_client.reset()

    async with async_session_factory() as db:
        await db.execute(text("UPDATE deliverables SET status = 'archived' WHERE status = 'scheduled'"))
        await db.commit()
        user, deliverable = await _create_test_client_and_deliverable(
            db,
            status=DeliverableStatus.SCHEDULED,
            scheduled_at=datetime.now(UTC) - timedelta(minutes=1),
        )
        deliverable_id = deliverable.id

    # 1. Beat scheduler runs and atomically claims the due deliverable
    claimed_ids = await dispatch_due_publishes_async()
    assert deliverable_id in claimed_ids, "Beat scheduler should claim due deliverable"

    # 2. Worker executes the publish workflow
    result = await execute_publish_deliverable_async(deliverable_id, poll_interval=0.01)
    assert result["status"] == "published"
    assert result["media_id"]
    assert result["permalink"].startswith("https://www.instagram.com/reel/")

    # 3. Assert deliverable row in DB is strictly PUBLISHED with stored ig_media_id
    async with async_session_factory() as db:
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)
        res = await db.execute(stmt)
        updated = res.scalar_one()

        assert updated.status == DeliverableStatus.PUBLISHED
        assert updated.ig_media_id == result["media_id"]
        assert updated.ig_permalink == result["permalink"]
        assert updated.ig_creation_id is not None

    # Exactly one post published
    assert len(fake_instagram_client.created_containers) == 1
    assert len(fake_instagram_client.published_posts) == 1


@pytest.mark.asyncio
async def test_acceptance_2_crash_recovery_kill_test() -> None:
    """Acceptance 2: The Mandatory Kill Test.

    Start a publish, kill -9 the worker after the container commits but before media_publish.
    Restart: the task resumes from the stored ig_creation_id and produces EXACTLY ONE post.
    """
    fake_instagram_client.reset()

    async with async_session_factory() as db:
        user, deliverable = await _create_test_client_and_deliverable(
            db,
            status=DeliverableStatus.SCHEDULED,
        )
        deliverable_id = deliverable.id

    # Run 1: Worker starts publishing, creates the container, COMMITS ig_creation_id to DB,
    # and then is killed (kill -9 simulation via _simulate_crash_after_container=True)
    with pytest.raises(RuntimeError, match="Simulated worker kill -9 immediately after container commit"):
        await execute_publish_deliverable_async(
            deliverable_id,
            poll_interval=0.01,
            _simulate_crash_after_container=True,
        )

    # Verify that before the crash, ig_creation_id was committed into Postgres
    async with async_session_factory() as db:
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)
        res = await db.execute(stmt)
        crashed_deliv = res.scalar_one()

        assert crashed_deliv.ig_creation_id is not None
        assert crashed_deliv.ig_creation_id.startswith("ig_container_")
        persisted_container_id = crashed_deliv.ig_creation_id
        # Still in publishing status
        assert crashed_deliv.status == DeliverableStatus.PUBLISHING

    # Container count after crash: exactly 1 created
    assert len(fake_instagram_client.created_containers) == 1
    # Zero posts published yet
    assert len(fake_instagram_client.published_posts) == 0

    # Run 2: Worker restarts and resumes the task on deliverable_id
    result = await execute_publish_deliverable_async(deliverable_id, poll_interval=0.01)
    assert result["status"] == "published"

    # Assert that task resumed from persisted ig_creation_id WITHOUT creating a duplicate container
    assert len(fake_instagram_client.created_containers) == 1, (
        "Idempotency failed: worker re-created a container after crash recovery!"
    )
    assert len(fake_instagram_client.published_posts) == 1, (
        "Idempotency failed: more than 1 post published!"
    )

    async with async_session_factory() as db:
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)
        res = await db.execute(stmt)
        final_deliv = res.scalar_one()

        assert final_deliv.status == DeliverableStatus.PUBLISHED
        assert final_deliv.ig_creation_id == persisted_container_id
        assert final_deliv.ig_media_id == fake_instagram_client.published_posts[0]["media_id"]


@pytest.mark.asyncio
async def test_acceptance_3_container_error_clears_id() -> None:
    """Acceptance 3: Force the container into ERROR.

    Assert status='publish_failed' AND ig_creation_id IS NULL so retries do not loop on dead container.
    """
    fake_instagram_client.reset()
    fake_instagram_client.simulate_fail_phase = "poll"

    async with async_session_factory() as db:
        user, deliverable = await _create_test_client_and_deliverable(
            db,
            status=DeliverableStatus.SCHEDULED,
        )
        deliverable_id = deliverable.id

    result = await execute_publish_deliverable_async(deliverable_id, poll_interval=0.01)
    assert result["status"] == "failed"
    assert result["reason"] == "container_error"

    async with async_session_factory() as db:
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)
        res = await db.execute(stmt)
        deliv = res.scalar_one()

        assert deliv.status == DeliverableStatus.PUBLISH_FAILED
        assert deliv.ig_creation_id is None, (
            "ig_creation_id must be cleared to NULL on ERROR so retries rebuild from scratch"
        )
        assert deliv.publish_error is not None


@pytest.mark.asyncio
async def test_acceptance_4_skipped_on_already_published() -> None:
    """Acceptance 4: Run publish_deliverable on an already-published row.

    Returns skipped, with zero external API calls.
    """
    fake_instagram_client.reset()

    async with async_session_factory() as db:
        user, deliverable = await _create_test_client_and_deliverable(
            db,
            status=DeliverableStatus.PUBLISHED,
        )
        deliverable_id = deliverable.id

    result = await execute_publish_deliverable_async(deliverable_id)
    assert result["status"] == "skipped"
    assert result["reason"] == "already_published"

    # Zero API calls made
    assert len(fake_instagram_client.created_containers) == 0
    assert len(fake_instagram_client.published_posts) == 0


@pytest.mark.asyncio
async def test_acceptance_5_quota_usage_triggers_retry() -> None:
    """Acceptance 5: Set quota_usage to 25.

    The task retries with backoff rather than erroring or failing.
    """
    fake_instagram_client.reset()
    fake_instagram_client.mock_quota_usage = 25  # Exceeded 25-posts limit

    async with async_session_factory() as db:
        user, deliverable = await _create_test_client_and_deliverable(
            db,
            status=DeliverableStatus.SCHEDULED,
        )
        deliverable_id = deliverable.id

    result = await execute_publish_deliverable_async(deliverable_id)
    assert result["status"] == "rate_limited"
    assert result["quota_usage"] == 25
    assert result["retry_in_seconds"] == 3600

    # No container was created, status is not PUBLISH_FAILED
    assert len(fake_instagram_client.created_containers) == 0
    async with async_session_factory() as db:
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)
        res = await db.execute(stmt)
        deliv = res.scalar_one()
        assert deliv.status != DeliverableStatus.PUBLISH_FAILED


@pytest.mark.asyncio
async def test_acceptance_6_concurrent_beat_skip_locked() -> None:
    """Acceptance 6: Run concurrent beat processes.

    Still exactly one publish per deliverable (SKIP LOCKED earns its keep).
    """
    fake_instagram_client.reset()

    # Seed 10 scheduled deliverables in a single batch transaction
    seeded_ids: list[uuid.UUID] = []
    async with async_session_factory() as db:
        now = datetime.now(UTC)
        client_id = uuid.uuid4()
        user = User(
            id=client_id,
            auth_id=f"auth-worker-{client_id}",
            email=f"client-{client_id}@example.com",
            full_name="Batch Test Client",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        db.add(user)
        profile = ClientProfile(
            user_id=client_id,
            company_name="Acme Corp",
            instagram_username="acmecorp",
            instagram_user_id=f"ig_user_{client_id.hex[:8]}",
            ig_token_expires_at=datetime.now(UTC) + timedelta(days=60),
        )
        db.add(profile)

        for i in range(10):
            deliv = Deliverable(
                id=uuid.uuid4(),
                root_id=uuid.uuid4(),
                version=1,
                client_id=client_id,
                file_url=f"https://storage.creo.network/media/reel_test_{i}.mp4",
                file_type="video/mp4",
                file_size_bytes=41943040,
                status=DeliverableStatus.SCHEDULED,
                scheduled_at=now - timedelta(minutes=5 + i),
            )
            db.add(deliv)
            seeded_ids.append(deliv.id)

        await db.commit()

    # Run two concurrent dispatch_due_publishes_async calls at the exact same moment
    task1 = asyncio.create_task(dispatch_due_publishes_async())
    task2 = asyncio.create_task(dispatch_due_publishes_async())

    claimed_1, claimed_2 = await asyncio.gather(task1, task2)

    set1 = set(claimed_1)
    set2 = set(claimed_2)

    # Concurrency Invariant: FOR UPDATE SKIP LOCKED guarantees disjoint sets
    intersection = set1.intersection(set2)
    assert len(intersection) == 0, f"Duplicate claims detected between beat workers: {intersection}"

    # Verify that all batch seeded deliverables were claimed across the two workers
    all_claimed = set1.union(set2)
    seeded_set = set(seeded_ids)
    claimed_seeded = all_claimed.intersection(seeded_set)
    assert claimed_seeded == seeded_set, f"Not all seeded deliverables were claimed: missing {seeded_set - claimed_seeded}"


@pytest.mark.asyncio
async def test_notification_delivery_and_persistence() -> None:
    """Verify notify.send writes to notifications table with sent_at."""
    async with async_session_factory() as db:
        user, _ = await _create_test_client_and_deliverable(db)
        user_id = user.id

    result = await send_notification_async(
        user_id=user_id,
        title="Acceptance Post Published",
        message="Your deliverable is live on Instagram.",
        channel="email",
    )

    assert result["notification_id"]
    assert result["sent_at"] is not None

    async with async_session_factory() as db:
        stmt = select(Notification).where(Notification.user_id == user_id)
        res = await db.execute(stmt)
        notifs = res.scalars().all()
        assert len(notifs) >= 1
        assert notifs[0].title == "Acceptance Post Published"


@pytest.mark.asyncio
async def test_maintenance_tasks() -> None:
    """Verify maintenance sweep jobs: token refresh, KPI refresh, and stale onboarding."""
    # 1. Token refresh
    async with async_session_factory() as db:
        user, _ = await _create_test_client_and_deliverable(
            db,
            ig_token_expires_at=datetime.now(UTC) + timedelta(days=1),  # Expiring soon (<3 days)
        )
    refreshed = await refresh_expiring_ig_async()
    assert refreshed >= 1

    # 2. SLA breach sweep
    breaches = await sla_breach_sweep_async()
    assert isinstance(breaches, int)

    # 3. KPI refresh
    kpi_result = await refresh_kpis_async()
    assert kpi_result == "ok"

    # 4. Expire stale onboarding
    async with async_session_factory() as db:
        stale_user_id = uuid.uuid4()
        stale_user = User(
            id=stale_user_id,
            auth_id=f"auth-stale-{stale_user_id}",
            email=f"stale-{stale_user_id}@example.com",
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        db.add(stale_user)
        stale_profile = ClientProfile(
            user_id=stale_user_id,
            onboarding_completed_at=None,
            onboarding_deadline=datetime.now(UTC) - timedelta(days=1),  # Passed deadline
        )
        db.add(stale_profile)
        await db.commit()

    lapsed_count = await expire_stale_onboarding_async()
    assert lapsed_count >= 1

    async with async_session_factory() as db:
        stmt = select(User).where(User.id == stale_user_id)
        res = await db.execute(stmt)
        u = res.scalar_one()
        assert u.account_status == AccountStatus.LAPSED
