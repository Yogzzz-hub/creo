"""Task 7.20 — Internal dashboard flow integration tests."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from tests.conftest import auth_header, create_mock_token, create_mock_user
from models.enums import TaskStatus, DeliverableType, UserRole


def _result(scalar=None, scalars=None, rowcount=1):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.rowcount = rowcount
    return r


class TestDashboardFlow:
    @pytest.mark.asyncio
    @patch("core.security._is_token_revoked", return_value=False)
    async def test_full_dashboard_sequence(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(create_mock_token(user_id, "team_member"))

                # Step 1: Team Dashboard
                team_member = MagicMock()
                team_member.id = team_member_id
                team_member.daily_cap_posters = 5
                team_member.daily_cap_reels = 3
                team_member.daily_cap_stories = 4

                today_task = MagicMock()
                today_task.id = str(uuid.uuid4())
                today_task.deliverable_type = DeliverableType.poster
                today_task.status = TaskStatus.pending
                today_task.priority = 1
                today_task.due_date = None

                dash_queries = iter([
                    auth_result,
                    _result(scalar=team_member),
                    _result(scalar=2),
                    _result(scalar=1),
                    _result(scalar=0),
                    _result(scalar=3),
                    _result(scalar=0),
                    _result(scalar=0),
                    _result(scalars=[(today_task, "Client Co")]),
                ])

                async def mock_execute_dash(stmt, *args, **kwargs):
                    return next(dash_queries)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_dash)

                dash = await ac.get("/api/v1/dashboard/team", headers=hdrs)
                assert dash.status_code == 200
                d = dash.json()
                assert "daily_metrics" in d
                assert d["active_tasks_count"] == 3
                assert d["overdue_tasks_count"] == 0
                assert "pending_leave_requests" in d

                # Step 2: Tasks list
                task = MagicMock()
                task.id = str(uuid.uuid4())
                task.client_id = str(uuid.uuid4())
                task.assigned_to = team_member_id
                task.assigned_by = None
                task.deliverable_type = DeliverableType.reel
                task.status = TaskStatus.in_progress
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

                task_queries = iter([
                    auth_result,
                    _result(scalar=team_member),
                    _result(scalars=[task]),
                    _result(scalar=client_user),
                ])

                async def mock_execute_tasks(stmt, *args, **kwargs):
                    return next(task_queries)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_tasks)

                tasks_resp = await ac.get("/api/v1/tasks", headers=hdrs)
                assert tasks_resp.status_code == 200
                assert isinstance(tasks_resp.json(), list)
                assert len(tasks_resp.json()) >= 1

                # Step 3: Request assignment
                unassigned = MagicMock()
                unassigned.id = task.id
                unassigned.assigned_to = None

                assign_queries = iter([
                    auth_result,
                    _result(scalar=team_member),
                    _result(scalar=unassigned),
                ])

                async def mock_execute_assign(stmt, *args, **kwargs):
                    return next(assign_queries)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_assign)
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
    @patch("core.security._is_token_revoked", return_value=False)
    async def test_assignment_rejects_already_assigned(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        team_member = MagicMock()
        team_member.id = team_member_id
        task = MagicMock()
        task.id = str(uuid.uuid4())
        task.assigned_to = str(uuid.uuid4())

        queries = iter([
            auth_result,
            _result(scalar=team_member),
            _result(scalar=task),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/v1/tasks/{task.id}/request-assignment",
                    headers=auth_header(create_mock_token(user_id, "team_member")),
                )
                assert resp.status_code == 409
                error = resp.json()
                msg = error.get("error", {}).get("message", error.get("detail", ""))
                assert "already assigned" in msg.lower()

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_token_revoked", return_value=False)
    async def test_assignment_rejects_non_team_member(self, mock_revoked, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        queries = iter([
            auth_result,
            _result(scalar=None),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    f"/api/v1/tasks/{str(uuid.uuid4())}/request-assignment",
                    headers=auth_header(create_mock_token(user_id, "team_member")),
                )
                assert resp.status_code == 403

        finally:
            app.dependency_overrides.pop(get_db, None)
