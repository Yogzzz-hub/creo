"""Task 5.20 — Onboarding flow integration tests.

Sequence: Register User -> Accept Terms -> Submit Questionnaire.
Celery task (generate_ai_analysis) is mocked so tests run instantly.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from tests.conftest import auth_header, create_mock_token, create_mock_user
from models.enums import UserRole


def _result(scalar=None, scalars=None, rowcount=1):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.rowcount = rowcount
    return r


class TestOnboardingFlow:
    """Register -> Accept Terms -> Submit Questionnaire (Celery mocked)."""

    @pytest.mark.asyncio
    @patch("routers.auth.notify_incomplete_signup", autospec=True)
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_full_onboarding_sequence(self, mock_revoked, mock_celery, mock_db_session: AsyncMock):
        from core.exceptions import limiter as _limiter
        _limiter._storage.reset()
        user_id = str(uuid.uuid4())
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")
        mock_user = create_mock_user(auth_id=auth_id, role=UserRole.client)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(token)

                # Step 1: Register — no auth needed (register endpoint doesn't use get_current_user)
                mock_db_session.execute = AsyncMock(side_effect=[
                    _result(scalar=None),  # auth_id lookup
                    _result(scalar=None),  # email lookup
                ])
                mock_db_session.add = MagicMock()
                mock_db_session.commit = AsyncMock()

                async def _refresh_user(obj):
                    obj.id = user_id

                mock_db_session.refresh = AsyncMock(side_effect=_refresh_user)

                reg = await ac.post(
                    "/api/v1/auth/register",
                    json={
                        "auth_id": auth_id,
                        "email": "flow@test.com",
                        "full_name": "Flow User",
                        "phone": "+919876543210",
                        "business_name": "Flow Corp",
                    },
                    headers=hdrs,
                )
                assert reg.status_code == 201
                assert reg.json()["role"] == "client"

                # Step 2: Accept Terms (needs auth)
                terms_queries = iter([
                    auth_result,
                    _result(),
                ])

                async def mock_execute_terms(stmt, *args, **kwargs):
                    return next(terms_queries)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_terms)
                mock_db_session.commit = AsyncMock()

                terms = await ac.post(
                    "/api/v1/onboarding/accept-terms",
                    headers=hdrs,
                )
                assert terms.status_code == 200
                assert terms.json()["status"] == "success"

                # Step 3: Submit Questionnaire (needs auth)
                q_queries = iter([
                    auth_result,
                    _result(scalar=None),
                ])

                async def mock_execute_q(stmt, *args, **kwargs):
                    return next(q_queries)

                mock_db_session.execute = AsyncMock(side_effect=mock_execute_q)
                mock_db_session.add = MagicMock()
                mock_db_session.commit = AsyncMock()

                fake_task = MagicMock()
                fake_task.delay = MagicMock()

                import workers.ai_tasks as _ai_tasks
                _original = getattr(_ai_tasks, "generate_ai_analysis", None)
                setattr(_ai_tasks, "generate_ai_analysis", fake_task)

                mock_ai_mod = MagicMock()
                mock_ai_mod.generate_ai_analysis = fake_task
                mock_svc = MagicMock()

                import sys as _sys
                _old_modules = {}
                for key in ("services.ai_analysis", "workers.ai_tasks", "openai"):
                    _old_modules[key] = _sys.modules.get(key)
                _sys.modules["services.ai_analysis"] = mock_svc
                _sys.modules["workers.ai_tasks"] = mock_ai_mod
                _sys.modules["openai"] = mock_svc

                try:
                    q = await ac.post(
                        "/api/v1/questionnaire",
                        json={
                            "industry": "Restaurant",
                            "business_description": "Fine dining",
                            "target_audience": {
                                "age": "25-45",
                                "location": "Mumbai",
                                "interests": "food",
                            },
                            "social_handles": {
                                "instagram": "@test",
                                "facebook": "",
                                "linkedin": "",
                            },
                            "primary_goal": "brand_awareness",
                            "brand_tone": ["Friendly"],
                        },
                        headers=hdrs,
                    )
                    assert q.status_code == 201
                    assert q.json()["status"] == "success"

                    if fake_task.delay.call_count > 0:
                        fake_task.delay.assert_called_once()
                    else:
                        fake_task.assert_called_once()
                finally:
                    if _original is not None:
                        setattr(_ai_tasks, "generate_ai_analysis", _original)
                    else:
                        try:
                            delattr(_ai_tasks, "generate_ai_analysis")
                        except AttributeError:
                            pass
                    for key, val in _old_modules.items():
                        if val is not None:
                            _sys.modules[key] = val
                        else:
                            _sys.modules.pop(key, None)

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_questionnaire_rejects_duplicate(self, mock_revoked, mock_db_session: AsyncMock):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")
        mock_user = create_mock_user(auth_id=auth_id, role=UserRole.client)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        existing = MagicMock()
        existing.user_id = str(uuid.uuid4())
        existing.submitted_at = None

        queries = iter([
            auth_result,
            _result(scalar=existing),
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
                    "/api/v1/questionnaire",
                    json={
                        "industry": "Tech",
                        "business_description": "SaaS",
                        "target_audience": {"age": "30", "location": "Global", "interests": "tech"},
                        "social_handles": {"instagram": "", "facebook": "", "linkedin": ""},
                        "primary_goal": "lead_generation",
                        "brand_tone": ["Professional"],
                    },
                    headers=auth_header(token),
                )
                assert resp.status_code == 409

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_questionnaire_status_pending(self, mock_revoked, mock_db_session: AsyncMock):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")
        mock_user = create_mock_user(auth_id=auth_id, role=UserRole.client)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        q = MagicMock()
        q.ai_summary_line = None
        q.submitted_at = datetime.now(timezone.utc)

        queries = iter([
            auth_result,
            _result(scalar=q),
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
                resp = await ac.get(
                    "/api/v1/questionnaire/status",
                    headers=auth_header(token),
                )
                assert resp.status_code == 200
                assert resp.json()["status"] == "pending"

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    @patch("core.security._is_jti_revoked", return_value=False)
    async def test_questionnaire_status_completed(self, mock_revoked, mock_db_session: AsyncMock):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")
        mock_user = create_mock_user(auth_id=auth_id, role=UserRole.client)

        auth_result = MagicMock()
        auth_result.scalar_one_or_none.return_value = mock_user

        q = MagicMock()
        q.ai_summary_line = "Bold brand with friendly tone"
        q.submitted_at = datetime.now(timezone.utc)

        queries = iter([
            auth_result,
            _result(scalar=q),
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
                resp = await ac.get(
                    "/api/v1/questionnaire/status",
                    headers=auth_header(token),
                )
                assert resp.status_code == 200
                data = resp.json()
                assert data["status"] == "completed"
                assert data["summary_line"] == "Bold brand with friendly tone"

        finally:
            app.dependency_overrides.pop(get_db, None)
