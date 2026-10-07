import uuid
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI, HTTPException

from app.core.middleware import RequestIdMiddleware
from app.core.performance import request_timings
from app.core.rbac import Actor
from app.models.enums import UserRole
from app.routers.admin import get_admin_calendar, get_pod_dashboard
from app.routers.notifications import list_notifications
from app.routers.auth import get_me
from app.core.security import create_access_token, decode_token
from app.models.enums import AccountStatus
from app.config import Settings


@pytest.mark.asyncio
async def test_request_timings_share_endpoint_context_and_reset():
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get('/timing')
    async def endpoint():
        timings = request_timings.get()
        timings.db_queries = 2
        timings.db_ms = 12.5
        return {'ok': True}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='http://test') as client:
        response = await client.get('/timing')
    assert 'db;dur=12.5;desc="2 queries"' in response.headers['server-timing']
    assert request_timings.get() is None


@pytest.mark.asyncio
async def test_unread_count_includes_notifications_outside_recent_twenty():
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN)
    notification = SimpleNamespace(id=uuid.uuid4(), title='Review', message='Ready', link=None, is_read=False, created_at=None)
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(all=lambda: [(notification, 27)])))
    result = await list_notifications(actor=actor, db=db)
    assert result['unread_count'] == 27
    assert len(result['items']) == 1
    assert db.execute.await_count == 1


def test_provider_postgres_urls_use_async_driver_without_changing_redis():
    settings = Settings(DATABASE_URL='postgres://user:password@db:5432/creo',
                        DIRECT_DATABASE_URL='postgresql://user:password@db:5432/creo',
                        REDIS_URL='redis://cache:6379/0')
    assert settings.DATABASE_URL.startswith('postgresql+asyncpg://')
    assert settings.DIRECT_DATABASE_URL.startswith('postgresql+asyncpg://')
    assert settings.REDIS_URL == 'redis://cache:6379/0'


def test_background_jobs_inherit_redis_and_preserve_explicit_brokers():
    with patch.dict(os.environ, {}, clear=True):
        settings = Settings(_env_file=None, REDIS_URL='redis://cache:6379/0')
        assert settings.CELERY_BROKER_URL == settings.REDIS_URL
        assert settings.CELERY_RESULT_BACKEND == settings.REDIS_URL
        settings = Settings(_env_file=None, REDIS_URL='redis://cache:6379/0',
                            CELERY_BROKER_URL='redis://queue:6379/1',
                            CELERY_RESULT_BACKEND='redis://results:6379/2')
        assert settings.CELERY_BROKER_URL == 'redis://queue:6379/1'
        assert settings.CELERY_RESULT_BACKEND == 'redis://results:6379/2'


@pytest.mark.asyncio
async def test_runtime_diagnostics_require_admin_and_do_not_query_database():
    from app.main import app
    transport = httpx.ASGITransport(app=app)
    with patch('app.core.rbac.is_user_suspended_in_cache', new=AsyncMock(return_value=False)):
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.get('/api/v1/admin/performance/runtime')
            assert response.status_code == 401
            token = create_access_token(subject=uuid.uuid4(), role='client')
            response = await client.get('/api/v1/admin/performance/runtime', headers={'Authorization': f'Bearer {token}'})
            assert response.status_code == 403
            token = create_access_token(subject=uuid.uuid4(), role='admin')
            response = await client.get('/api/v1/admin/performance/runtime', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert 'db;dur=0.0;desc="0 queries"' in response.headers['server-timing']
    assert 'database_pool' in response.json()
    assert all(key not in response.json() for key in ('DATABASE_URL', 'password', 'host', 'JWT_SECRET'))


@pytest.mark.asyncio
async def test_calendar_rejects_invalid_month_before_database_access():
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.ADMIN)
    db = SimpleNamespace(execute=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await get_admin_calendar(month=13, year=2026, actor=actor, db=db)
    assert error.value.status_code == 400
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_empty_pod_never_falls_back_to_unrelated_clients_or_global_tasks():
    actor = Actor(user_id=uuid.uuid4(), role=UserRole.TEAM_LEAD, email='new-lead@example.com', agency_id=uuid.uuid4())
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(all=lambda: [])))
    result = await get_pod_dashboard(actor=actor, db=db)
    assert result['clients'] == []
    assert all(not tasks for tasks in result['tasks'].values())
    assert db.execute.await_count == 4


@pytest.mark.asyncio
async def test_session_refresh_preserves_agency_and_loads_staff_profile_once():
    agency_id = uuid.uuid4()
    user = SimpleNamespace(id=uuid.uuid4(), email='staff@example.com', full_name='Staff',
                           role=UserRole.ADMIN, agency_id=agency_id,
                           account_status=AccountStatus.ACTIVE, must_reset_password=False)
    actor = Actor(user_id=user.id, role=user.role, agency_id=agency_id)
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(first=lambda: (user, None))))
    result = await get_me(actor=actor, db=db)
    assert decode_token(result['access_token'])['agency_id'] == str(agency_id)
    assert db.execute.await_count == 1
