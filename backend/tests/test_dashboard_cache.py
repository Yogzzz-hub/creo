import uuid
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI

from app.core.dashboard_cache import GENERATION_KEY, dashboard_cached, invalidate_dashboard_cache
from app.core.rbac import Actor, AdminActor
from app.core.errors import AppError, app_error_handler
from app.core.security import create_access_token
from app.models.enums import UserRole


class MemoryRedis:
    def __init__(self):
        self.data = {}

    async def mget(self, *keys):
        return [self.data.get(key) for key in keys]

    async def incr(self, key):
        self.data[key] = str(int(self.data.get(key, "0")) + 1)

    async def eval(self, script, count, generation_key, key, generation, snapshot, ttl):
        if self.data.get(generation_key, "0") == generation:
            self.data[key] = snapshot


@pytest.mark.asyncio
async def test_snapshots_are_scoped_and_invalidated_without_database_reads():
    redis = MemoryRedis()
    calls = 0

    @dashboard_cached()
    async def endpoint(actor, pod=None, db=None):
        nonlocal calls
        calls += 1
        return {"calls": calls}

    actor = Actor(uuid.uuid4(), UserRole.ADMIN, agency_id=uuid.uuid4())
    other_agency = Actor(actor.user_id, actor.role, agency_id=uuid.uuid4())
    with patch('app.core.dashboard_cache.get_redis', new=AsyncMock(return_value=redis)):
        assert await endpoint(actor) == await endpoint(actor)
        assert calls == 1
        await endpoint(other_agency)
        await endpoint(actor, pod='beta')
        assert calls == 3
        await invalidate_dashboard_cache()
        await endpoint(actor)
        assert calls == 4


@pytest.mark.asyncio
async def test_inflight_read_cannot_publish_after_mutation_and_cache_outage_is_optional():
    redis = MemoryRedis()
    calls = 0

    @dashboard_cached()
    async def endpoint(actor):
        nonlocal calls
        calls += 1
        await redis.incr(GENERATION_KEY)
        return {"calls": calls}

    actor = Actor(uuid.uuid4(), UserRole.ADMIN)
    with patch('app.core.dashboard_cache.get_redis', new=AsyncMock(return_value=redis)):
        await endpoint(actor)
        await endpoint(actor)
        assert calls == 2
    assert list(redis.data) == [GENERATION_KEY]
    with patch('app.core.dashboard_cache.get_redis', new=AsyncMock(side_effect=ConnectionError)):
        assert (await endpoint(actor))['calls'] == 3
        await invalidate_dashboard_cache()


@pytest.mark.asyncio
async def test_cache_hits_still_enforce_roles_and_revocation():
    redis = MemoryRedis()
    app = FastAPI()
    app.add_exception_handler(AppError, app_error_handler)
    calls = 0

    @app.get('/dashboard')
    @dashboard_cached()
    async def endpoint(actor: Actor = AdminActor):
        nonlocal calls
        calls += 1
        return {'ok': True}

    user_id = uuid.uuid4()
    admin_token = create_access_token(subject=user_id, role='admin')
    client_token = create_access_token(subject=user_id, role='client')
    with patch('app.core.dashboard_cache.get_redis', new=AsyncMock(return_value=redis)), \
         patch('app.core.rbac.is_user_suspended_in_cache', new=AsyncMock(return_value=False)) as suspended:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='http://test') as client:
            headers = {'Authorization': f'Bearer {admin_token}'}
            assert (await client.get('/dashboard', headers=headers)).status_code == 200
            assert (await client.get('/dashboard', headers=headers)).status_code == 200
            assert calls == 1
            assert suspended.await_count == 2
            assert (await client.get('/dashboard', headers={'Authorization': f'Bearer {client_token}'})).status_code == 403
            suspended.return_value = True
            assert (await client.get('/dashboard', headers=headers)).status_code == 401
            assert (await client.get('/dashboard')).status_code == 401
            assert calls == 1
