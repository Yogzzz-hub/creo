"""Tests for leave request submission, persistence, listing, and admin approval/rejection workflow."""

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from models.enums import Department, LeaveStatus, UserRole
from models.leave import LeaveRequest
from tests.conftest import auth_header, create_mock_token, create_mock_user


def _result(scalar=None, scalars=None, rowcount=1, first_row=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.first.return_value = first_row
    r.rowcount = rowcount
    return r


class TestLeaveFlow:
    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_create_leave_request_success(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        team_member = MagicMock()
        team_member.id = team_member_id

        queries = iter([
            _result(scalar=mock_user),
            _result(scalar=team_member),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        async def fake_refresh(instance):
            if not getattr(instance, "id", None):
                instance.id = str(uuid.uuid4())
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)
        mock_db_session.commit = AsyncMock()
        mock_db_session.refresh = AsyncMock(side_effect=fake_refresh)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                token = create_mock_token(user_id, "team_member")
                payload = {
                    "start_date": "2026-09-01",
                    "end_date": "2026-09-05",
                    "reason": "Annual vacation",
                }
                resp = await ac.post("/api/v1/leave", json=payload, headers=auth_header(token))
                assert resp.status_code == 201
                data = resp.json()
                assert data["start_date"] == "2026-09-01"
                assert data["end_date"] == "2026-09-05"
                assert data["reason"] == "Annual vacation"
                assert data["status"] == "pending"
                assert mock_db_session.add.called
                assert mock_db_session.commit.called
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_create_leave_request_invalid_dates(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        team_member = MagicMock()
        team_member.id = str(uuid.uuid4())

        queries = iter([
            _result(scalar=mock_user),
            _result(scalar=team_member),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                token = create_mock_token(user_id, "team_member")
                payload = {
                    "start_date": "2026-09-10",
                    "end_date": "2026-09-05",  # Invalid: end < start
                    "reason": "Invalid dates test",
                }
                resp = await ac.post("/api/v1/leave", json=payload, headers=auth_header(token))
                assert resp.status_code == 422
                error_resp = resp.json()["error"]
                assert "End date must be on or after start date" in str(error_resp)
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_create_leave_request_less_than_7_days(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        team_member = MagicMock()
        team_member.id = str(uuid.uuid4())

        queries = iter([
            _result(scalar=mock_user),
            _result(scalar=team_member),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                token = create_mock_token(user_id, "team_member")
                # Use today's date + 2 days
                future_date = date.today() + timedelta(days=2)
                payload = {
                    "start_date": future_date.isoformat(),
                    "end_date": (future_date + timedelta(days=1)).isoformat(),
                    "reason": "Short notice",
                }
                resp = await ac.post("/api/v1/leave", json=payload, headers=auth_header(token))
                assert resp.status_code == 422
                error_resp = resp.json()["error"]
                assert "at least 7 days in advance" in str(error_resp)
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_create_leave_request_non_team_member(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        queries = iter([
            _result(scalar=mock_user),
            _result(scalar=None),  # Not a registered team member
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                token = create_mock_token(user_id, "team_member")
                payload = {
                    "start_date": "2026-09-01",
                    "end_date": "2026-09-02",
                    "reason": "Personal work",
                }
                resp = await ac.post("/api/v1/leave", json=payload, headers=auth_header(token))
                assert resp.status_code == 403
                error_resp = resp.json()["error"]
                assert "not a registered team member" in str(error_resp.get("message", ""))
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_list_my_leave_requests(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        user_id = str(uuid.uuid4())
        team_member_id = str(uuid.uuid4())
        mock_user = create_mock_user(auth_id=user_id, role=UserRole.team_member)

        team_member = MagicMock()
        team_member.id = team_member_id

        leave1 = MagicMock()
        leave1.id = str(uuid.uuid4())
        leave1.team_member_id = team_member_id
        leave1.start_date = date(2026, 9, 1)
        leave1.end_date = date(2026, 9, 3)
        leave1.reason = "Medical leave"
        leave1.status = LeaveStatus.approved
        leave1.reviewed_by = str(uuid.uuid4())
        leave1.reviewed_at = datetime.now(timezone.utc)
        leave1.created_at = datetime.now(timezone.utc)
        leave1.updated_at = datetime.now(timezone.utc)

        queries = iter([
            _result(scalar=mock_user),
            _result(scalar=team_member),
            _result(scalars=[leave1]),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                token = create_mock_token(user_id, "team_member")
                resp = await ac.get("/api/v1/leave", headers=auth_header(token))
                assert resp.status_code == 200
                data = resp.json()
                assert len(data) == 1
                assert data[0]["id"] == leave1.id
                assert data[0]["status"] == "approved"
                assert data[0]["reason"] == "Medical leave"
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_admin_list_and_approve_leave_request(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        admin_user_id = str(uuid.uuid4())
        mock_admin = create_mock_user(auth_id=admin_user_id, role=UserRole.admin)

        leave_id = str(uuid.uuid4())
        tm_id = str(uuid.uuid4())

        leave = MagicMock()
        leave.id = leave_id
        leave.team_member_id = tm_id
        leave.start_date = date(2026, 9, 10)
        leave.end_date = date(2026, 9, 12)
        leave.reason = "Vacation"
        leave.status = LeaveStatus.pending
        leave.reviewed_by = None
        leave.reviewed_at = None
        leave.created_at = datetime.now(timezone.utc)
        leave.updated_at = datetime.now(timezone.utc)

        tm = MagicMock()
        tm.id = tm_id
        tm.department = Department.graphics

        user = MagicMock()
        user.full_name = "Jane Designer"

        # Queries for GET /api/v1/admin/leave
        queries_list = iter([
            _result(scalar=mock_admin),
            _result(scalars=[leave]),
            _result(first_row=(tm, user)),
        ])

        async def mock_execute_list(stmt, *args, **kwargs):
            return next(queries_list)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute_list)

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                admin_token = create_mock_token(admin_user_id, "admin")

                # Test List
                resp = await ac.get("/api/v1/admin/leave", headers=auth_header(admin_token))
                assert resp.status_code == 200
                list_data = resp.json()
                assert len(list_data) == 1
                assert list_data[0]["employee_name"] == "Jane Designer"
                assert list_data[0]["department"] == "graphics"

                # Test Approve
                queries_approve = iter([
                    _result(scalar=mock_admin),
                    _result(scalar=leave),
                ])

                async def mock_execute_approve(stmt, *args, **kwargs):
                    return next(queries_approve)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_approve)
                mock_db_session.commit = AsyncMock()

                approve_resp = await ac.post(
                    f"/api/v1/admin/leave/{leave_id}/approve",
                    headers=auth_header(admin_token),
                )
                assert approve_resp.status_code == 200
                assert leave.status == LeaveStatus.approved
                assert leave.reviewed_by == mock_admin.id
                assert leave.reviewed_at is not None
        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_admin_reject_leave_request(
        self, mock_revoked, mock_db_session: AsyncMock
    ):
        admin_user_id = str(uuid.uuid4())
        mock_admin = create_mock_user(auth_id=admin_user_id, role=UserRole.admin)

        leave_id = str(uuid.uuid4())
        tm_id = str(uuid.uuid4())

        leave = MagicMock()
        leave.id = leave_id
        leave.team_member_id = tm_id
        leave.start_date = date(2026, 9, 15)
        leave.end_date = date(2026, 9, 16)
        leave.reason = "Personal"
        leave.status = LeaveStatus.pending
        leave.reviewed_by = None
        leave.reviewed_at = None
        leave.created_at = datetime.now(timezone.utc)
        leave.updated_at = datetime.now(timezone.utc)

        queries = iter([
            _result(scalar=mock_admin),
            _result(scalar=leave),
        ])

        async def mock_execute(stmt, *args, **kwargs):
            return next(queries)

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)
        mock_db_session.commit = AsyncMock()

        async def _override_db():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override_db
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                admin_token = create_mock_token(admin_user_id, "admin")

                resp = await ac.post(
                    f"/api/v1/admin/leave/{leave_id}/reject",
                    headers=auth_header(admin_token),
                )
                assert resp.status_code == 200
                assert leave.status == LeaveStatus.rejected
                assert leave.reviewed_by == mock_admin.id
                assert leave.reviewed_at is not None
        finally:
            app.dependency_overrides.pop(get_db, None)
