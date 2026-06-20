"""Task 8.30 — Admin panel flow integration tests.

Sequence (admin): Fetch Admin KPI -> Fetch Clients -> Update Scarcity Settings.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from tests.conftest import auth_header, create_mock_token


def _result(scalar=None, scalars=None, rowcount=1):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.rowcount = rowcount
    return r


class TestAdminFlow:
    """Admin KPI -> Clients List -> Update Scarcity Settings."""

    @pytest.mark.asyncio
    async def test_full_admin_sequence(self, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        token = create_mock_token(user_id, "admin")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(token)

                # ── Step 1: GET /api/v1/admin/kpi ──────────────────
                # Queries: approved_count, total_submitted, active_tasks,
                #   team_members join, per-member load (x N), revenue
                tm = MagicMock()
                tm.id = str(uuid.uuid4())
                tm.daily_cap_posters = 5
                tm.daily_cap_reels = 3
                tm.daily_cap_stories = 4

                tm_user = MagicMock()
                tm_user.full_name = "Designer A"

                mock_db_session.execute = AsyncMock(
                    side_effect=[
                        _result(scalar=80),          # approved count
                        _result(scalar=100),         # total submitted
                        _result(scalar=5),           # active tasks
                        _result(scalars=[(tm, tm_user)]),  # team members
                        _result(scalar=3),           # member load
                        _result(scalar=500000.0),    # revenue
                    ]
                )

                kpi = await ac.get("/api/v1/admin/kpi", headers=hdrs)
                assert kpi.status_code == 200
                k = kpi.json()
                assert "delivery_rate_percentage" in k
                assert "team_capacity_bars" in k
                assert isinstance(k["team_capacity_bars"], list)
                assert k["total_revenue"] == 500000.0

                # ── Step 2: GET /api/v1/admin/clients ───────────────
                client_user = MagicMock()
                client_user.id = str(uuid.uuid4())
                client_user.full_name = "Client User"
                client_user.business_name = "Client Corp"
                client_user.email = "client@test.com"
                client_user.plan_name = MagicMock(value="growth")
                client_user.account_status = MagicMock(value="active")
                client_user.created_at = MagicMock()
                client_user.created_at.isoformat.return_value = "2026-06-01T00:00:00"

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalars=[client_user])]
                )

                clients = await ac.get("/api/v1/admin/clients", headers=hdrs)
                assert clients.status_code == 200
                cl = clients.json()
                assert isinstance(cl, list)
                assert len(cl) >= 1

                # ── Step 3: PATCH /api/v1/admin/settings (scarcity) ─
                existing = MagicMock()
                existing.id = "default"
                existing.sla_delivery_days = 3
                existing.sla_revision_hours = 48
                existing.scarcity_slots_available = 5

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=existing)]
                )
                mock_db_session.commit = AsyncMock()
                mock_db_session.refresh = AsyncMock()

                settings = await ac.patch(
                    "/api/v1/admin/settings",
                    json={"scarcity_slots_available": 8},
                    headers=hdrs,
                )
                assert settings.status_code == 200

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_kpi_excludes_revenue_for_non_admin(
        self, mock_db_session: AsyncMock
    ):
        token = create_mock_token(str(uuid.uuid4()), "team_lead")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                mock_db_session.execute = AsyncMock(
                    side_effect=[
                        _result(scalar=10),
                        _result(scalar=20),
                        _result(scalar=2),
                        _result(scalars=[]),
                    ]
                )

                resp = await ac.get(
                    "/api/v1/admin/kpi",
                    headers=auth_header(token),
                )
                assert resp.status_code == 200
                assert resp.json()["total_revenue"] is None

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_settings_creates_default_if_missing(
        self, mock_db_session: AsyncMock
    ):
        token = create_mock_token(str(uuid.uuid4()), "admin")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=None)]
                )
                mock_db_session.add = MagicMock()
                mock_db_session.flush = AsyncMock()
                mock_db_session.commit = AsyncMock()

                async def _refresh(obj):
                    obj.id = "default"
                    obj.scarcity_slots_available = 10

                mock_db_session.refresh = AsyncMock(side_effect=_refresh)

                resp = await ac.patch(
                    "/api/v1/admin/settings",
                    json={"scarcity_slots_available": 10},
                    headers=auth_header(token),
                )
                assert resp.status_code == 200

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_clients_list_empty(self, mock_db_session: AsyncMock):
        token = create_mock_token(str(uuid.uuid4()), "admin")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalars=[])]
                )

                resp = await ac.get(
                    "/api/v1/admin/clients",
                    headers=auth_header(token),
                )
                assert resp.status_code == 200
                assert resp.json() == []

        finally:
            app.dependency_overrides.pop(get_db, None)
