from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import uuid

import pytest
from app.models.enums import AccountStatus
from app.services.instagram_client import InstagramError
from app.workers.tasks import publish
from app.routers import publishing as router


@pytest.mark.asyncio
async def test_preparation_window_does_not_allow_publishing_early():
    client_id, agency_id, connection_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    job = SimpleNamespace(client_id=client_id, agency_id=agency_id, connection_id=connection_id,
        instagram_account_id="123", scheduled_at=datetime.now(UTC) + timedelta(minutes=10))
    d = SimpleNamespace(client_id=client_id, agency_id=agency_id)
    profile = SimpleNamespace(ig_connection_status="connected", ig_connection_id=connection_id,
        instagram_user_id="123", ig_token_expires_at=None, ig_token_encrypted=b"sealed")
    db = SimpleNamespace(refresh=AsyncMock(), get=AsyncMock(return_value=SimpleNamespace(agency_id=agency_id, account_status=AccountStatus.ACTIVE)),
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: uuid.uuid4())))
    with patch.object(publish.publishing, "approved", return_value=True), patch.object(publish.connection, "unseal", return_value={"token": "redacted"}):
        assert await publish.eligible(db, job, d, profile, preparing=True)
        with pytest.raises(InstagramError) as error:
            await publish.eligible(db, job, d, profile, preparing=False)
        assert error.value.code == "NOT_DUE"
        job.scheduled_at = datetime.now(UTC) + timedelta(hours=1)
        with pytest.raises(InstagramError):
            await publish.eligible(db, job, d, profile, preparing=True)


@pytest.mark.asyncio
async def test_client_timing_request_pauses_preparation_and_releases_claim():
    client_id = uuid.uuid4()
    actor = SimpleNamespace(role="client", user_id=client_id)
    d = SimpleNamespace(client_id=client_id)
    job = SimpleNamespace(status="processing", stage="container", lease_id=uuid.uuid4(), lease_until=datetime.now(UTC), next_attempt_at=datetime.now(UTC))
    db = SimpleNamespace(commit=AsyncMock())
    with patch.object(router, "deliverable", AsyncMock(return_value=d)), \
         patch.object(router.service, "lock_profile", AsyncMock()), \
         patch.object(router.service, "job_for", AsyncMock(return_value=job)), \
         patch.object(router.service, "audit", AsyncMock()), \
         patch.object(router.service, "notify", AsyncMock()):
        await router.request_timing(uuid.uuid4(), router.TimingRequestBody(requested_at=datetime.now(UTC)+timedelta(hours=1), reason="Launch moved"), actor, db)
    assert job.status == "paused" and job.lease_id is None and job.next_attempt_at is None
