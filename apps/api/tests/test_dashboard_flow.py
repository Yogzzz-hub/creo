"""Task 7.20 — Internal dashboard flow integration tests.

Sequence (team member): Fetch Team Dashboard -> Fetch Tasks -> Request Task Assignment.
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


class TestDashboardFlow:
    """Team Dashboard -> Tasks List -> Request Assignment."""

    @pytest.mark.asyncio
    async def test_full_dashboard_sequence(self, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        token = create_mock_token(user_id, "team_member")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(token)

                # ── Step 1: GET /api/v1/dashboard/team ──────────────
                team_member = MagicMock()
                team_member.id = team_member_id
                team_member.daily_cap_posters = 5
                team_member.daily_cap_reels = 3
                team_member.daily_cap_stories = 4

                today_task = MagicMock()
                today_task.id = str(uuid.uuid4())
                today_task.deliverable_type = MagicMock(value="poster")
                today_task.status = MagicMock(value="pending")
                today_task.priority = 1
                today_task.due_date = None

                mock_db_session.execute = AsyncMock(
                    side_effect=[
                        _result(scalar=team_member),      # team_member lookup
                        _result(scalar=2),                 # posters completed
                        _result(scalar=1),                 # reels completed
                        _result(scalar=0),                 # stories completed
                        _result(scalar=3),                 # active tasks count
                        _result(scalar=0),                 # overdue tasks count
                        _result(scalar=0),                 # pending leave count
                        _result(scalars=[(today_task, "Client Co")]),  # today's tasks
                    ]
                )

                dash = await ac.get("/api/v1/dashboard/team", headers=hdrs)
                assert dash.status_code == 200
                d = dash.json()
                assert "daily_metrics" in d
                assert d["active_tasks_count"] == 3
                assert d["overdue_tasks_count"] == 0
                assert isinstance(d["today_tasks"], list)

                # ── Step 2: GET /api/v1/tasks ───────────────────────
                task = MagicMock()
                task.id = str(uuid.uuid4())
                task.client_id = str(uuid.uuid4())
                task.assigned_to = team_member_id
                task.assigned_by = None
                task.deliverable_type = MagicMock(value="reel")
                task.status = MagicMock(value="in_progress")
                task.priority = 2
                task.is_addon = False
                task.assignment_date = None
                task.due_date = None
                task.submitted_at = None
                task.created_at = MagicMock()
                task.updated_at = None

                client_user = MagicMock()
                client_user.id = task.client_id
                client_user.full_name = "Test Client"
                client_user.business_name = "Client Co"
                client_user.plan_name = MagicMock(value="growth")

                mock_db_session.execute = AsyncMock(
                    side_effect=[
                        _result(scalar=team_member),          # team_member lookup
                        _result(scalars=[task]),               # tasks list
                        _result(scalar=client_user),           # client lookup for task
                    ]
                )

                tasks = await ac.get("/api/v1/tasks", headers=hdrs)
                assert tasks.status_code == 200
                assert isinstance(tasks.json(), list)
                assert len(tasks.json()) >= 1

                # ── Step 3: POST /api/v1/tasks/{id}/request-assignment
                unassigned = MagicMock()
                unassigned.id = task.id
                unassigned.assigned_to = None

                mock_db_session.execute = AsyncMock(
                    side_effect=[
                        _result(scalar=team_member),   # team_member lookup
                        _result(scalar=unassigned),     # task lookup
                    ]
                )
                mock_db_session.commit = AsyncMock()
                mock_db_session.refresh = AsyncMock()

                assign = await ac.post(
                    f"/api/v1/tasks/{task.id}/request-assignment",
                    headers=hdrs,
                )
                assert assign.status_code == 200
                assert "successfully" in assign.json()["message"].lower()

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_assignment_rejects_already_assigned(
        self, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        token = create_mock_token(user_id, "team_member")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                team_member = MagicMock()
                team_member.id = team_member_id

                task = MagicMock()
                task.id = str(uuid.uuid4())
                task.assigned_to = str(uuid.uuid4())

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=team_member), _result(scalar=task)]
                )

                resp = await ac.post(
                    f"/api/v1/tasks/{task.id}/request-assignment",
                    headers=auth_header(token),
                )
                assert resp.status_code == 409
                assert "already assigned" in resp.json()["detail"].lower()

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_assignment_rejects_non_team_member(
        self, mock_db_session: AsyncMock
    ):
        token = create_mock_token(str(uuid.uuid4()), "team_member")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=None)]
                )

                resp = await ac.post(
                    f"/api/v1/tasks/{str(uuid.uuid4())}/request-assignment",
                    headers=auth_header(token),
                )
                assert resp.status_code == 403

        finally:
            app.dependency_overrides.pop(get_db, None)
