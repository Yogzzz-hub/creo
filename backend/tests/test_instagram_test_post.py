import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager

import pytest

from app.core.errors import Conflict, Forbidden
from app.models.enums import AccountStatus, UserRole
from app.services import instagram_test_post as service
from app.services.instagram_client import InstagramError


def profile(provider="instagram"):
    return SimpleNamespace(ig_connection_status="connected", ig_token_encrypted=b"sealed",
        ig_metadata={"provider": provider}, instagram_user_id="12345", ig_connection_id=uuid.uuid4(),
        ig_token_expires_at=datetime.now(UTC) + timedelta(days=1))


@pytest.mark.asyncio
async def test_scheduling_rejects_past_and_naive_times():
    for when in (datetime.now(), datetime.now(UTC) - timedelta(minutes=1)):
        with pytest.raises(Conflict):
            await service.create(None, None, uuid.uuid4(), uuid.uuid4(), "12345", when)


@pytest.mark.asyncio
async def test_worker_does_not_publish_future_test_early():
    row = SimpleNamespace(status="queued", scheduled_at=datetime.now(UTC) + timedelta(hours=1))
    db = AsyncMock()
    db.__aenter__.return_value = db
    db.execute.return_value = SimpleNamespace(scalar_one_or_none=lambda: row)
    @asynccontextmanager
    async def tenant(*args, **kwargs):
        yield db
    with patch.object(service, "async_session_factory", return_value=db), patch.object(service, "tenant_session", tenant), patch.object(service, "client_for_provider") as provider:
        await service.run(uuid.uuid4(), uuid.uuid4(), None)
    provider.assert_not_called()
    db.commit.assert_not_awaited()


def test_both_connection_providers_are_supported_but_changed_connection_is_rejected():
    for provider in ("instagram", "facebook"):
        p = profile(provider)
        service.check_connection(p, "12345", p.ig_connection_id)
        with pytest.raises(Conflict):
            service.check_connection(p, "12345", uuid.uuid4())
        p.ig_token_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        with pytest.raises(Conflict):
            service.check_connection(p, "12345")


@pytest.mark.asyncio
async def test_lead_cannot_publish_to_a_client_outside_their_pod():
    agency = uuid.uuid4()
    actor = SimpleNamespace(role=UserRole.TEAM_LEAD, user_id=uuid.uuid4(), agency_id=agency, token_version=0)
    caller = SimpleNamespace(role=actor.role, account_status=AccountStatus.ACTIVE,
        must_reset_password=False, token_version=0, agency_id=agency)
    client = SimpleNamespace(role=UserRole.CLIENT, account_status=AccountStatus.ACTIVE, agency_id=agency)
    db = SimpleNamespace(get=AsyncMock(side_effect=[caller, client]))
    with patch.object(service.workflow, "on_client_pod", AsyncMock(return_value=False)):
        with pytest.raises(Forbidden):
            await service.authorize(db, actor, uuid.uuid4())


@pytest.mark.asyncio
async def test_duplicate_request_returns_original_without_another_submission():
    p = profile()
    actor = SimpleNamespace(user_id=uuid.uuid4())
    client_id = uuid.uuid4()
    row = SimpleNamespace(client_id=client_id, actor_id=actor.user_id)
    db = SimpleNamespace(get=AsyncMock(return_value=row))
    with patch.object(service.settings, "INSTAGRAM_TEST_POSTING_ENABLED", True), \
         patch.object(service.settings, "INSTAGRAM_CLIENT_MODE", "real"), \
         patch.object(service, "authorize", AsyncMock()), \
         patch.object(service.publishing, "lock_profile", AsyncMock(return_value=p)), \
         patch.object(service.connection, "require_configuration"):
        result, created = await service.create(db, actor, client_id, uuid.uuid4(), "12345")
        assert result is row and created is False


@pytest.mark.asyncio
@pytest.mark.parametrize("provider_name", ["facebook", "instagram"])
async def test_publish_uses_correct_provider_token_and_never_retries_ambiguous_submission(provider_name):
    p = profile(provider_name)
    row = SimpleNamespace(id=uuid.uuid4(), client_id=uuid.uuid4(), status="queued",
        account_id="12345", connection_id=p.ig_connection_id, container_id=None, error=None, scheduled_at=None)
    db = AsyncMock()
    db.execute.return_value = SimpleNamespace(scalar_one_or_none=lambda: row)
    db.get.return_value = row
    db.__aenter__.return_value = db
    provider = AsyncMock()
    provider.create_media_container.return_value = "container"
    provider.get_container_status.return_value = "FINISHED"
    provider.publish_container.side_effect = InstagramError("Unconfirmed", ambiguous=True)
    @asynccontextmanager
    async def tenant(*args, **kwargs):
        yield db
    with patch.object(service, "async_session_factory", return_value=db), \
         patch.object(service, "tenant_session", tenant), \
         patch.object(service.settings, "INSTAGRAM_TEST_POSTING_ENABLED", True), \
         patch.object(service, "authorize", AsyncMock()), \
         patch.object(service.publishing, "lock_profile", AsyncMock(return_value=p)), \
         patch.object(service.connection, "unseal", return_value={"provider": provider_name, "user_token": "user", "page_token": "page"}), \
         patch.object(service, "client_for_provider", return_value=provider), \
         patch.object(service.storage_service, "put_object", return_value="stored"), \
         patch.object(service, "inspect_media", AsyncMock(return_value=("https://media.example/sample.jpg", {}))):
        await service.run(row.id, uuid.uuid4(), SimpleNamespace())
    assert row.status == "uncertain"
    provider.publish_container.assert_awaited_once_with("12345", "container", "user" if provider_name == "instagram" else "page")
