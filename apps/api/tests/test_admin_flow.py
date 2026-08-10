"""Task 8.30 — Admin panel flow integration tests."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from tests.conftest import MockResponseManager, auth_header, create_mock_token, create_mock_user
from models.enums import UserRole


def _result(scalar=None, scalars=None, rowcount=1):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.rowcount = rowcount
    return r


class TestAdminFlow:
    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_full_admin_sequence(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.admin)

        # Auth query: return the mock user
        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        # KPI queries
        tm = MagicMock()
        tm.id = str(uuid.uuid4())
        tm.daily_cap_posters = 5
        tm.daily_cap_reels = 3
        tm.daily_cap_stories = 4
        tm_user = MagicMock()
        tm_user.full_name = "Designer A"

        call_idx = [0]
        async def mock_execute(stmt, *args, **kwargs):
            call_idx[0] += 1
            if call_idx[0] == 1:
                return auth_result
            elif call_idx[0] == 2:
                r = MagicMock(); r.scalar.return_value = 80; return r
            elif call_idx[0] == 3:
                r = MagicMock(); r.scalar.return_value = 100; return r
            elif call_idx[0] == 4:
                r = MagicMock(); r.scalar.return_value = 5; return r
            elif call_idx[0] == 5:
                r = MagicMock(); r.scalars.return_value.all.return_value = [(tm, tm_user)]; return r
            elif call_idx[0] == 6:
                r = MagicMock(); r.all.return_value = []; return r
            elif call_idx[0] == 7:
                r = MagicMock(); r.scalar.return_value = 500000.0; return r
            else:
                r = MagicMock(); r.scalar.return_value = 0; return r

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(create_mock_token(user_id, "admin"))

                kpi = await ac.get("/api/v1/admin/kpi", headers=hdrs)
                assert kpi.status_code == 200
                k = kpi.json()
                assert "delivery_rate_percentage" in k
                assert "team_capacity_bars" in k
                assert k["total_revenue"] == 500000.0

                # Step 2: Clients
                client_user = MagicMock()
                client_user.id = str(uuid.uuid4())
                client_user.full_name = "Client User"
                client_user.business_name = "Client Corp"
                client_user.email = "client@test.com"
                client_user.plan_name = MagicMock(value="growth")
                client_user.account_status = MagicMock(value="active")
                client_user.created_at = MagicMock()
                client_user.created_at.isoformat.return_value = "2026-06-01T00:00:00"

                clients_result = MagicMock()
                clients_result.scalars.return_value.all.return_value = [client_user]
                call_idx2 = [0]
                async def mock_execute_clients(stmt, *args, **kwargs):
                    call_idx2[0] += 1
                    if call_idx2[0] == 1:
                        return auth_result
                    return clients_result

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_clients)

                clients = await ac.get("/api/v1/admin/clients", headers=hdrs)
                assert clients.status_code == 200
                assert isinstance(clients.json(), list)
                assert len(clients.json()) >= 1

                # Step 3: Settings
                existing = MagicMock()
                existing.id = "default"
                existing.scarcity_slots_available = 5
                existing.sla_delivery_days = 3
                existing.sla_revision_hours = 48

                settings_result = MagicMock()
                settings_result.scalar_one_or_none.return_value = existing
                call_idx3 = [0]
                async def mock_execute_settings(stmt, *args, **kwargs):
                    call_idx3[0] += 1
                    if call_idx3[0] == 1:
                        return auth_result
                    return settings_result

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_settings)
                mock_db_session.commit = AsyncMock()
                mock_db_session.refresh = AsyncMock()

                settings_resp = await ac.patch(
                    "/api/v1/admin/settings",
                    json={"scarcity_slots_available": 8},
                    headers=hdrs,
                )
                assert settings_resp.status_code == 200

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_kpi_excludes_revenue_for_non_admin(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_lead)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        call_idx = [0]
        async def mock_execute(stmt, *args, **kwargs):
            call_idx[0] += 1
            if call_idx[0] == 1:
                return auth_result
            elif call_idx[0] == 2:
                r = MagicMock(); r.scalar.return_value = 10; return r
            elif call_idx[0] == 3:
                r = MagicMock(); r.scalar.return_value = 20; return r
            elif call_idx[0] == 4:
                r = MagicMock(); r.scalar.return_value = 2; return r
            elif call_idx[0] == 5:
                r = MagicMock(); r.scalars.return_value.all.return_value = []; return r
            else:
                r = MagicMock(); r.scalar.return_value = 0; return r

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/api/v1/admin/kpi", headers=auth_header(create_mock_token(user_id, "team_lead")))
                assert resp.status_code == 403

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_settings_creates_default_if_missing(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.admin)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user
        settings_result = MagicMock()
        settings_result.scalar_one_or_none.return_value = None

        call_idx = [0]
        async def mock_execute(stmt, *args, **kwargs):
            call_idx[0] += 1
            if call_idx[0] == 1:
                return auth_result
            return settings_result

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)
        mock_db_session.add = MagicMock()
        mock_db_session.flush = AsyncMock()
        mock_db_session.commit = AsyncMock()

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                async def _refresh(obj):
                    obj.id = "default"
                    obj.scarcity_slots_available = 10
                    obj.sla_delivery_days = 3
                    obj.sla_revision_hours = 48

                mock_db_session.refresh = AsyncMock(side_effect=_refresh)

                resp = await ac.patch(
                    "/api/v1/admin/settings",
                    json={"scarcity_slots_available": 10},
                    headers=auth_header(create_mock_token(user_id, "admin")),
                )
                assert resp.status_code == 200

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_clients_list_empty(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.admin)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user
        clients_result = MagicMock()
        clients_result.scalars.return_value.all.return_value = []

        call_idx = [0]
        async def mock_execute(stmt, *args, **kwargs):
            call_idx[0] += 1
            if call_idx[0] == 1:
                return auth_result
            return clients_result

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/api/v1/admin/clients", headers=auth_header(create_mock_token(user_id, "admin")))
                assert resp.status_code == 200
                assert resp.json() == []

        finally:
            app.dependency_overrides.pop(get_db, None)
