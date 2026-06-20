"""Task 5.20 — Onboarding flow integration tests.

Sequence: Register User -> Accept Terms -> Submit Questionnaire.
Celery task (generate_ai_analysis) is mocked so tests run instantly.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from tests.conftest import auth_header, create_mock_token


def _result(scalar=None, scalars=None, rowcount=1):
    """Build a mock DB execute result."""
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar
    r.scalar.return_value = scalar
    r.scalars.return_value.all.return_value = scalars or []
    r.rowcount = rowcount
    return r


@pytest.fixture()
def onboarding_client(mock_db_session: AsyncMock):
    async def _override():
        yield mock_db_session

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)

    async def _factory():
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    return _factory, mock_db_session


class TestOnboardingFlow:
    """Register -> Accept Terms -> Submit Questionnaire (Celery mocked)."""

    @pytest.mark.asyncio
    async def test_full_onboarding_sequence(self, mock_db_session: AsyncMock):
        user_id = str(uuid.uuid4())
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                hdrs = auth_header(token)

                # ── Step 1: Register ────────────────────────────────
                # Queries: 1) auth_id lookup → None, 2) email lookup → None
                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=None), _result(scalar=None)]
                )
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

                # ── Step 2: Accept Terms ────────────────────────────
                # accept_terms uses db.execute(update(...)) then commit
                mock_db_session.execute = AsyncMock(return_value=_result())
                mock_db_session.commit = AsyncMock()

                terms = await ac.post(
                    "/api/v1/onboarding/accept-terms",
                    headers=hdrs,
                )
                assert terms.status_code == 200
                assert terms.json()["status"] == "success"

                # ── Step 3: Submit Questionnaire (Celery mocked) ────
                # Queries: 1) existing questionnaire → None
                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=None)]
                )
                mock_db_session.add = MagicMock()
                mock_db_session.commit = AsyncMock()

                with patch.dict(
                    "sys.modules",
                    {"workers.ai_tasks": MagicMock()},
                ):
                    fake_task = MagicMock()
                    fake_task.delay = MagicMock()
                    with patch(
                        "routers.questionnaires.generate_ai_analysis",
                        fake_task,
                        create=True,
                    ):
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
                        fake_task.delay.assert_called_once()

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_questionnaire_rejects_duplicate(
        self, mock_db_session: AsyncMock
    ):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                existing = MagicMock()
                existing.user_id = str(uuid.uuid4())

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=existing)]
                )

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
                assert "already submitted" in resp.json()["detail"].lower()

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_questionnaire_status_pending(
        self, mock_db_session: AsyncMock
    ):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                q = MagicMock()
                q.ai_summary_line = None

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=q)]
                )

                resp = await ac.get(
                    "/api/v1/questionnaire/status",
                    headers=auth_header(token),
                )
                assert resp.status_code == 200
                assert resp.json()["status"] == "pending"

        finally:
            app.dependency_overrides.pop(get_db, None)

    @pytest.mark.asyncio
    async def test_questionnaire_status_completed(
        self, mock_db_session: AsyncMock
    ):
        auth_id = str(uuid.uuid4())
        token = create_mock_token(auth_id, "client")

        async def _override():
            yield mock_db_session

        app.dependency_overrides[get_db] = _override
        transport = ASGITransport(app=app)

        try:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                q = MagicMock()
                q.ai_summary_line = "Bold brand with friendly tone"

                mock_db_session.execute = AsyncMock(
                    side_effect=[_result(scalar=q)]
                )

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
