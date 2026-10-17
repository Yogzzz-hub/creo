"""Offline regressions for review transitions and broker-independent dispatch."""

import uuid
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services import publishing_service as service
from app.workers.tasks import publish, scheduler
from app.config import settings
from app.core.errors import Conflict, Forbidden
from app.routers.publishing import dispatch


@pytest.mark.asyncio
@pytest.mark.parametrize("configured,provided", [("", ""), ("secret", ""), ("secret", "wrong")])
async def test_dispatch_requires_secret(configured, provided):
    with patch.object(settings, "PUBLISHING_DISPATCH_SECRET", configured), \
         patch.object(scheduler, "dispatch_due_publishes_async", AsyncMock()) as sweep:
        with pytest.raises(Forbidden):
            await dispatch(provided)
    sweep.assert_not_awaited()


@pytest.mark.asyncio
async def test_authenticated_dispatch_uses_same_durable_worker():
    with patch.object(settings, "PUBLISHING_DISPATCH_SECRET", "secret"), \
         patch.object(publish, "enabled", return_value=True), \
         patch.object(scheduler, "dispatch_due_publishes_async", AsyncMock(return_value=[uuid.uuid4()])) as sweep:
        assert await dispatch("secret") == {"status": "ok", "processed": 1}
    sweep.assert_awaited_once_with(inline=True)


@pytest.mark.asyncio
async def test_authenticated_dispatch_respects_feature_flag():
    with patch.object(settings, "PUBLISHING_DISPATCH_SECRET", "secret"), \
         patch.object(publish, "enabled", return_value=False), \
         patch.object(scheduler, "dispatch_due_publishes_async", AsyncMock()) as sweep:
        with pytest.raises(Conflict):
            await dispatch("secret")
    sweep.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["in_production", "pending_qa", "pending_approval"])
async def test_normal_review_does_not_cancel_schedule(target):
    d = SimpleNamespace(id=uuid.uuid4(), client_id=uuid.uuid4())
    job = SimpleNamespace(status="pending_approval", approved_fingerprint=None,
                          approved_by=None, last_error=None, error_code=None)
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(
        scalar_one_or_none=lambda: uuid.uuid4())))
    with patch.object(service, "lock_profile", AsyncMock()), \
         patch.object(service, "job_for", AsyncMock(return_value=job)), \
         patch.object(service, "audit", AsyncMock()):
        await service.on_deliverable_transition(db, d, target, uuid.uuid4())
    assert job.status == "pending_approval"
    assert job.last_error is None


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["qa_rejected", "revision_requested", "archived"])
async def test_rejection_still_cancels_and_revokes_approval(target):
    d = SimpleNamespace(id=uuid.uuid4(), client_id=uuid.uuid4())
    job = SimpleNamespace(status="scheduled", approved_fingerprint="approved", approved_by=d.client_id)
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(
        scalar_one_or_none=lambda: uuid.uuid4())))
    with patch.object(service, "lock_profile", AsyncMock()), \
         patch.object(service, "job_for", AsyncMock(return_value=job)), \
         patch.object(service, "audit", AsyncMock()):
        await service.on_deliverable_transition(db, d, target, d.client_id)
    assert job.status == "canceled"
    assert job.error_code == "VERSION_INVALIDATED"
    assert job.approved_fingerprint is None


@pytest.mark.asyncio
@pytest.mark.parametrize("invalidated", [True, False])
async def test_fresh_client_approval_recovers_invalidation_but_not_manual_cancel(invalidated):
    d = SimpleNamespace(id=uuid.uuid4(), client_id=uuid.uuid4())
    job = SimpleNamespace(status="canceled", error_code="VERSION_INVALIDATED" if invalidated else None,
                          last_error=None, caption="caption", media_type="REELS", media_metadata={})
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(
        scalar_one_or_none=lambda: uuid.uuid4())), get=AsyncMock())
    with patch.object(service, "lock_profile", AsyncMock()), \
         patch.object(service, "job_for", AsyncMock(return_value=job)), \
         patch.object(service, "fingerprint", return_value="reviewed"), \
         patch.object(service, "set_ready") as ready, \
         patch.object(service, "audit", AsyncMock()), \
         patch.object(service, "notify", AsyncMock()):
        await service.on_deliverable_transition(db, d, "approved", d.client_id, "reviewed")
    assert ready.call_count == int(invalidated)


@pytest.mark.asyncio
async def test_api_recovery_executes_durable_jobs_without_broker_and_continues_after_failure():
    agency_id = uuid.uuid4()
    ids = [uuid.uuid4(), uuid.uuid4()]
    db = SimpleNamespace(execute=AsyncMock(side_effect=[None, SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: ids))]), commit=AsyncMock())

    @asynccontextmanager
    async def session(*args, **kwargs):
        yield db

    with patch.object(scheduler, "async_session_factory", session), \
         patch.object(scheduler, "tenant_session", session), \
         patch.object(scheduler, "_get_active_agencies", AsyncMock(return_value=[agency_id])), \
         patch.object(publish, "enabled", return_value=True), \
         patch.object(publish, "execute_publish_job", AsyncMock(side_effect=[RuntimeError(), {"status": "published"}])) as execute, \
         patch.object(publish.publish_deliverable_task, "apply_async") as enqueue:
        result = await scheduler.dispatch_due_publishes_async(inline=True)
    assert result == [ids[1]]
    assert execute.await_count == 2
    enqueue.assert_not_called()


@pytest.mark.asyncio
async def test_disabled_recovery_never_reads_or_publishes_jobs():
    with patch.object(publish, "enabled", return_value=False), \
         patch.object(scheduler, "_get_active_agencies", AsyncMock()) as agencies:
        assert await scheduler.dispatch_due_publishes_async(inline=True) == []
    agencies.assert_not_awaited()
