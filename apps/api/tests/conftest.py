import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.enums import AccountStatus, UserRole


TEST_JWT_SECRET = settings.SUPABASE_JWT_SECRET or "test-secret-key-for-testing-only"


def create_mock_token(auth_id: str, role: str = "client") -> str:
    payload = {
        "sub": auth_id,
        "role": role,
        "email": f"{role}@test.com",
        "iat": datetime.now(timezone.utc).timestamp(),
        "exp": datetime.now(timezone.utc).timestamp() + 3600,
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


def create_mock_user(
    auth_id: str | None = None,
    role: UserRole = UserRole.client,
    email: str | None = None,
    full_name: str = "Test User",
    account_status: AccountStatus = AccountStatus.active,
) -> MagicMock:
    user = MagicMock()
    user.id = str(uuid.uuid4())
    user.auth_id = auth_id or str(uuid.uuid4())
    user.email = email or f"{role.value}@test.com"
    user.full_name = full_name
    user.role = role
    user.account_status = account_status
    user.deleted_at = None
    user.phone = None
    user.business_name = None
    user.plan_name = None
    user.two_fa_enabled = False
    user.instagram_access_token = None
    user.instagram_user_id = None
    user.razorpay_customer_id = None
    user.stripe_customer_id = None
    return user


@pytest.fixture
def mock_db_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.close = AsyncMock()
    return session


@pytest_asyncio.fixture
async def client(mock_db_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    from core.database import get_db
    from main import app

    async def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "client")


@pytest.fixture
def team_member_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "team_member")


@pytest.fixture
def team_lead_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "team_lead")


@pytest.fixture
def sales_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "sales")


@pytest.fixture
def admin_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "admin")


@pytest.fixture
def super_admin_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "super_admin")


@pytest.fixture
def investor_relations_token() -> str:
    auth_id = str(uuid.uuid4())
    return create_mock_token(auth_id, "investor_relations")


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
