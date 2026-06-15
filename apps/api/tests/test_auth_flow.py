import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from main import app
from models.enums import AccountStatus, UserRole
from models.user import User


@pytest_asyncio.fixture
async def auth_client(mock_db_session: AsyncMock):
    async def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)


def _setup_no_existing_user(mock_db_session: AsyncMock):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=mock_result)


def _setup_existing_user_by_auth_id(mock_db_session: AsyncMock):
    existing = MagicMock(spec=User)
    existing.auth_id = "existing-auth-id"
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db_session.execute = AsyncMock(return_value=mock_result)


def _setup_existing_user_by_email(mock_db_session: AsyncMock):
    existing = MagicMock(spec=User)
    existing.email = "taken@example.com"
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    second_result = MagicMock()
    second_result.scalar_one_or_none.return_value = existing
    mock_db_session.execute = AsyncMock(side_effect=[mock_result, second_result])


def _setup_successful_insert(mock_db_session: AsyncMock):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    async def mock_refresh(obj):
        if hasattr(obj, "id"):
            obj.id = str(uuid.uuid4())

    mock_db_session.refresh = AsyncMock(side_effect=mock_refresh)
    mock_db_session.add = MagicMock()
    mock_db_session.commit = AsyncMock()


class TestRegisterEndpoint:
    @pytest.mark.asyncio
    async def test_register_creates_user_successfully(self, auth_client, mock_db_session):
        _setup_successful_insert(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": str(uuid.uuid4()),
                "email": "newuser@test.com",
                "full_name": "New User",
                "phone": "+919876543210",
                "business_name": "Test Business",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "client"
        assert data["account_status"] == "pending_verification"
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_minimal_fields(self, auth_client, mock_db_session):
        _setup_successful_insert(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": str(uuid.uuid4()),
                "email": "minimal@test.com",
                "full_name": "Minimal User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "minimal@test.com"
        assert data["full_name"] == "Minimal User"
        assert data["role"] == "client"

    @pytest.mark.asyncio
    async def test_register_duplicate_auth_id_returns_409(self, auth_client, mock_db_session):
        _setup_existing_user_by_auth_id(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": "existing-auth-id",
                "email": "another@test.com",
                "full_name": "Another User",
            },
        )

        assert response.status_code == 409
        data = response.json()
        assert "auth_id" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_email_returns_409(self, auth_client, mock_db_session):
        _setup_existing_user_by_email(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": str(uuid.uuid4()),
                "email": "taken@example.com",
                "full_name": "Duplicate Email User",
            },
        )

        assert response.status_code == 409
        data = response.json()
        assert "email" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_missing_required_fields_returns_422(self, auth_client, mock_db_session):
        _setup_no_existing_user(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_email_returns_422(self, auth_client, mock_db_session):
        _setup_no_existing_user(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": str(uuid.uuid4()),
                "full_name": "No Email User",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_auth_id_returns_422(self, auth_client, mock_db_session):
        _setup_no_existing_user(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "email": "noauth@test.com",
                "full_name": "No Auth ID User",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_sets_correct_defaults(self, auth_client, mock_db_session):
        _setup_successful_insert(mock_db_session)

        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "auth_id": str(uuid.uuid4()),
                "email": "defaults@test.com",
                "full_name": "Default User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "client"
        assert data["account_status"] == "pending_verification"
