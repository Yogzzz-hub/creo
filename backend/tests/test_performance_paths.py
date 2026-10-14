"""Latency regressions tested without external services or a production database."""

import asyncio
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core import dashboard_cache
from app.core.rbac import Actor
from app.models.enums import UserRole
from app.routers import auth, portal_dashboard
from app.services import storage_service


@pytest.fixture(autouse=True)
def reset_cache(monkeypatch):
    monkeypatch.setattr(dashboard_cache, "_unavailable_until", 0)


def actor():
    return Actor(user_id=uuid.uuid4(), role=UserRole.CLIENT)


def test_optional_cache_failure_is_not_retried_on_every_request(monkeypatch):
    redis = SimpleNamespace(mget=AsyncMock(side_effect=ConnectionError))
    get_redis = AsyncMock(return_value=redis)
    monkeypatch.setattr(dashboard_cache, "get_redis", get_redis)
    calls = 0

    @dashboard_cache.dashboard_cached()
    async def endpoint(actor: Actor):
        nonlocal calls
        calls += 1
        return {"count": calls}

    async def run():
        user = actor()
        assert await endpoint(actor=user) == {"count": 1}
        assert await endpoint(actor=user) == {"count": 2}
        await dashboard_cache.invalidate_dashboard_cache()

    asyncio.run(run())
    assert get_redis.await_count == 1
    assert redis.mget.await_count == 1


def test_slow_optional_cache_has_a_deadline(monkeypatch):
    async def slow(*_args):
        await asyncio.sleep(10)

    monkeypatch.setattr(dashboard_cache, "_CACHE_TIMEOUT", 0.01)
    monkeypatch.setattr(dashboard_cache, "get_redis", AsyncMock(return_value=SimpleNamespace(mget=slow)))

    @dashboard_cache.dashboard_cached()
    async def endpoint(actor: Actor):
        return "fresh database result"

    started = time.monotonic()
    assert asyncio.run(endpoint(actor=actor())) == "fresh database result"
    assert time.monotonic() - started < 0.5


def test_unavailable_cache_does_not_serialize_database_requests(monkeypatch):
    monkeypatch.setattr(dashboard_cache, "_unavailable_until", float("inf"))

    async def run():
        both_started = asyncio.Event()
        started = 0

        @dashboard_cache.dashboard_cached()
        async def endpoint(actor: Actor):
            nonlocal started
            started += 1
            if started == 2:
                both_started.set()
            await asyncio.wait_for(both_started.wait(), timeout=0.5)
            return "ok"

        user = actor()
        assert await asyncio.gather(endpoint(actor=user), endpoint(actor=user)) == ["ok", "ok"]

    asyncio.run(run())


def test_failed_invalidation_prevents_use_of_existing_snapshots(monkeypatch):
    redis = SimpleNamespace(incr=AsyncMock(side_effect=ConnectionError), mget=AsyncMock())
    monkeypatch.setattr(dashboard_cache, "get_redis", AsyncMock(return_value=redis))

    @dashboard_cache.dashboard_cached()
    async def endpoint(actor: Actor):
        return "uncached"

    async def run():
        await dashboard_cache.invalidate_dashboard_cache()
        assert await endpoint(actor=actor()) == "uncached"

    asyncio.run(run())
    redis.mget.assert_not_awaited()


def test_portal_onboarding_guard_runs_before_cached_aggregation(monkeypatch):
    from app.services import onboarding_service

    stage = AsyncMock(return_value=8)
    snapshot = AsyncMock(return_value={"ok": True})
    monkeypatch.setattr(onboarding_service, "get_current_stage", stage)
    monkeypatch.setattr(portal_dashboard, "_portal_dashboard_snapshot", snapshot)

    async def run():
        user = actor()
        for _ in range(2):
            await portal_dashboard.get_portal_dashboard(client_id=None, actor=user, db=object())

    asyncio.run(run())
    assert stage.await_count == 2
    assert snapshot.await_count == 2


def test_password_verification_does_not_block_unrelated_requests(monkeypatch):
    loop_thread = threading.get_ident()
    verification_thread = []

    def verify(*_args):
        verification_thread.append(threading.get_ident())
        time.sleep(0.05)
        return True

    user = SimpleNamespace(hashed_password="hash")
    monkeypatch.setattr(auth, "verify_password", verify)
    monkeypatch.setattr(auth, "_get_user_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(auth, "_issue_session", AsyncMock(return_value={"access_token": "test"}))
    monkeypatch.setattr(auth, "_check_rate_limit", lambda *_args, **_kwargs: True)

    async def run():
        sign_in = asyncio.create_task(auth.login(auth.LoginRequest(email="test@example.com", password="password123"), db=object()))
        await asyncio.sleep(0.01)
        assert not sign_in.done(), "The event loop should run while bcrypt is still working"
        assert await sign_in == {"access_token": "test"}

    asyncio.run(run())
    assert verification_thread[0] != loop_thread


def test_r2_signing_never_probes_the_bucket(monkeypatch):
    monkeypatch.setattr(storage_service.settings, "STORAGE_S3_ENABLED", True)
    monkeypatch.setattr(storage_service.settings, "AWS_ACCESS_KEY_ID", "review-key")
    monkeypatch.setattr(storage_service.settings, "AWS_SECRET_ACCESS_KEY", "review-secret")
    monkeypatch.setattr(storage_service, "_s3_healthy", None)
    client = SimpleNamespace(
        head_bucket=lambda **_: pytest.fail("Signing must not make a network request"),
        generate_presigned_url=lambda *_, **__: "https://media.example.com/signed",
    )
    monkeypatch.setattr(storage_service, "_get_s3_client", lambda: client)
    assert storage_service.signed_get("r2://clients/file.jpg") == "https://media.example.com/signed"


def test_disabled_r2_preserves_the_supabase_fallback(monkeypatch):
    import httpx

    monkeypatch.setattr(storage_service.settings, "STORAGE_S3_ENABLED", False)
    monkeypatch.setattr(storage_service.settings, "SUPABASE_URL", "https://storage.example.com")
    monkeypatch.setattr(storage_service.settings, "SUPABASE_SERVICE_ROLE_KEY", "test-only-key")
    monkeypatch.setattr(storage_service, "_get_s3_client", lambda: pytest.fail("Disabled R2 must not be used"))
    client = SimpleNamespace(post=lambda *_args, **_kwargs: httpx.Response(
        200, json={"signedURL": "/object/sign/creo/file.jpg?token=test"},
    ))
    monkeypatch.setattr(storage_service, "_storage_http_client", lambda: client)
    assert storage_service.signed_get("clients/file.jpg") == (
        "https://storage.example.com/storage/v1/object/sign/creo/file.jpg?token=test"
    )


def test_s3_clients_are_reused_and_credentials_are_part_of_the_identity(monkeypatch):
    import boto3

    clients = []

    def create(*_args, **kwargs):
        client = SimpleNamespace(options=kwargs)
        clients.append(client)
        return client

    monkeypatch.setattr(boto3, "client", create)
    storage_service._s3_client_for.cache_clear()
    try:
        first = storage_service._s3_client_for("auto", "https://r2.example.com", "key", "secret")
        assert first is storage_service._s3_client_for("auto", "https://r2.example.com", "key", "secret")
        second = storage_service._s3_client_for("auto", "https://r2.example.com", "key", "rotated")
        assert second is not first
        assert len(clients) == 2
    finally:
        storage_service._s3_client_for.cache_clear()


def test_simultaneous_media_reads_share_one_provider_signature(monkeypatch):
    calls = []

    def sign(raw, **_kwargs):
        calls.append(raw)
        time.sleep(0.03)
        return "https://media.example.com/signed"

    monkeypatch.setattr(storage_service, "signed_get", sign)
    raw = f"supabase://{uuid.uuid4()}.jpg"
    with ThreadPoolExecutor(max_workers=4) as pool:
        urls = list(pool.map(lambda _: storage_service.resolve_media_url(raw), range(4)))
    assert urls == ["https://media.example.com/signed"] * 4
    assert calls == [raw]


def test_supabase_preview_and_download_share_one_signature(monkeypatch):
    calls = []

    def sign(raw, **_kwargs):
        calls.append(raw)
        return "https://media.example.com/signed?token=test"

    monkeypatch.setattr(storage_service, "signed_get", sign)
    raw = f"supabase://{uuid.uuid4()}.jpg"
    preview = storage_service.resolve_media_url(raw)
    download = storage_service.resolve_media_url(raw, download_filename="Brand poster.jpg")
    assert download == preview + "&download=Brand%20poster.jpg"
    assert calls == [raw]


def test_media_batch_is_parallel_bounded_and_deduplicated(monkeypatch):
    lock = threading.Lock()
    active = 0
    peak = 0
    calls = []

    def resolve(raw, request):
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
            calls.append(raw)
        time.sleep(0.02)
        with lock:
            active -= 1
        return "https://media.example.com/" + raw

    monkeypatch.setattr(storage_service, "resolve_media_url", resolve)
    raw_urls = [str(i) for i in range(12)]
    result = asyncio.run(storage_service.resolve_media_urls(raw_urls + ["0", None]))
    assert len(calls) == 12
    assert len(result) == 12
    assert 1 < peak <= 6


class SnapshotRedis:
    def __init__(self):
        self.values = {}

    async def mget(self, *keys):
        return [self.values.get(key) for key in keys]

    async def incr(self, key):
        self.values[key] = str(int(self.values.get(key, "0")) + 1)

    async def eval(self, script, count, generation_key, key, generation, snapshot, ttl):
        if self.values.get(generation_key, "0") == generation:
            self.values[key] = snapshot


def test_dashboard_cache_never_shares_another_actors_data(monkeypatch):
    redis = SnapshotRedis()
    monkeypatch.setattr(dashboard_cache, "get_redis", AsyncMock(return_value=redis))
    calls = []

    @dashboard_cache.dashboard_cached()
    async def endpoint(actor: Actor):
        calls.append(actor.user_id)
        return {"owner": str(actor.user_id)}

    async def run():
        first, second = actor(), actor()
        assert await endpoint(actor=first) == {"owner": str(first.user_id)}
        assert await endpoint(actor=second) == {"owner": str(second.user_id)}
        assert await endpoint(actor=first) == {"owner": str(first.user_id)}

    asyncio.run(run())
    assert len(calls) == 2


def test_a_write_during_a_read_prevents_publishing_the_old_snapshot(monkeypatch):
    redis = SnapshotRedis()
    monkeypatch.setattr(dashboard_cache, "get_redis", AsyncMock(return_value=redis))
    calls = 0

    @dashboard_cache.dashboard_cached()
    async def endpoint(actor: Actor):
        nonlocal calls
        calls += 1
        if calls == 1:
            await dashboard_cache.invalidate_dashboard_cache()
        return {"version": calls}

    async def run():
        user = actor()
        assert await endpoint(actor=user) == {"version": 1}
        assert await endpoint(actor=user) == {"version": 2}
        assert await endpoint(actor=user) == {"version": 2}

    asyncio.run(run())
    assert calls == 2
