import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import (
    require_admin,
    require_client,
    require_investor_relations,
    require_sales,
    require_super_admin,
    require_team_lead,
    require_team_member,
)
from models.enums import UserRole
from tests.conftest import (
    auth_header,
    create_mock_token,
    create_mock_user,
)


test_app = FastAPI()


@pytest.mark.asyncio
@test_app.get("/test/client", dependencies=[Depends(require_client)])
async def test_client_endpoint():
    return {"role": "client"}


@pytest.mark.asyncio
@test_app.get("/test/team-member", dependencies=[Depends(require_team_member)])
async def test_team_member_endpoint():
    return {"role": "team_member"}


@pytest.mark.asyncio
@test_app.get("/test/team-lead", dependencies=[Depends(require_team_lead)])
async def test_team_lead_endpoint():
    return {"role": "team_lead"}


@pytest.mark.asyncio
@test_app.get("/test/sales", dependencies=[Depends(require_sales)])
async def test_sales_endpoint():
    return {"role": "sales"}


@pytest.mark.asyncio
@test_app.get("/test/admin", dependencies=[Depends(require_admin)])
async def test_admin_endpoint():
    return {"role": "admin"}


@pytest.mark.asyncio
@test_app.get("/test/super-admin", dependencies=[Depends(require_super_admin)])
async def test_super_admin_endpoint():
    return {"role": "super_admin"}


@pytest.mark.asyncio
@test_app.get("/test/investor-relations", dependencies=[Depends(require_investor_relations)])
async def test_investor_relations_endpoint():
    return {"role": "investor_relations"}


def _setup_user_in_db(mock_db_session: AsyncMock, user: MagicMock):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    mock_db_session.execute = AsyncMock(return_value=mock_result)


def _setup_no_user_in_db(mock_db_session: AsyncMock):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=mock_result)


@pytest_asyncio.fixture
async def test_client(mock_db_session: AsyncMock):
    async def override_db():
        yield mock_db_session

    test_app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    test_app.dependency_overrides.clear()


class TestUnauthenticatedAccess:
    @pytest.mark.asyncio
    async def test_no_token_returns_401(self, test_client: AsyncClient):
        response = await test_client.get("/test/client")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, test_client: AsyncClient):
        response = await test_client.get("/test/client", headers={"Authorization": "Bearer invalid-token"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_bearer_returns_401(self, test_client: AsyncClient):
        response = await test_client.get("/test/client", headers={"Authorization": "Bearer "})
        assert response.status_code == 401


class TestClientRoleAccess:
    @pytest.mark.asyncio
    async def test_client_can_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_client_cannot_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_client_cannot_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_client_cannot_access_sales_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/sales", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_client_cannot_access_super_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/super-admin", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_client_cannot_access_investor_relations_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.client)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "client")
        response = await test_client.get("/test/investor-relations", headers=auth_header(token))
        assert response.status_code == 403


class TestTeamMemberRoleAccess:
    @pytest.mark.asyncio
    async def test_team_member_can_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_member)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_member")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_team_member_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_member)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_member")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_team_member_cannot_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_member)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_member")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_team_member_cannot_access_sales_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_member)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_member")
        response = await test_client.get("/test/sales", headers=auth_header(token))
        assert response.status_code == 403


class TestTeamLeadRoleAccess:
    @pytest.mark.asyncio
    async def test_team_lead_can_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_lead)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_lead")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_team_lead_can_access_team_lead_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_lead)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_lead")
        response = await test_client.get("/test/team-lead", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_team_lead_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_lead)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_lead")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_team_lead_cannot_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.team_lead)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "team_lead")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 403


class TestSalesRoleAccess:
    @pytest.mark.asyncio
    async def test_sales_can_access_sales_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.sales)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "sales")
        response = await test_client.get("/test/sales", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sales_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.sales)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "sales")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_sales_cannot_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.sales)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "sales")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_sales_cannot_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.sales)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "sales")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 403


class TestAdminRoleAccess:
    @pytest.mark.asyncio
    async def test_admin_can_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "admin")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "admin")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_cannot_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "admin")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_cannot_access_super_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "admin")
        response = await test_client.get("/test/super-admin", headers=auth_header(token))
        assert response.status_code == 403


class TestSuperAdminRoleAccess:
    @pytest.mark.asyncio
    async def test_super_admin_can_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.super_admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "super_admin")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_super_admin_can_access_super_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.super_admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "super_admin")
        response = await test_client.get("/test/super-admin", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_super_admin_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.super_admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "super_admin")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_super_admin_cannot_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.super_admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "super_admin")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_super_admin_cannot_access_investor_relations_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.super_admin)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "super_admin")
        response = await test_client.get("/test/investor-relations", headers=auth_header(token))
        assert response.status_code == 403


class TestInvestorRelationsRoleAccess:
    @pytest.mark.asyncio
    async def test_investor_relations_can_access_investor_relations_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.investor_relations)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "investor_relations")
        response = await test_client.get("/test/investor-relations", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_investor_relations_cannot_access_client_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.investor_relations)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "investor_relations")
        response = await test_client.get("/test/client", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_investor_relations_cannot_access_admin_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.investor_relations)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "investor_relations")
        response = await test_client.get("/test/admin", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_investor_relations_cannot_access_team_member_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.investor_relations)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "investor_relations")
        response = await test_client.get("/test/team-member", headers=auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_investor_relations_cannot_access_sales_endpoint(self, test_client: AsyncClient, mock_db_session):
        user = create_mock_user(role=UserRole.investor_relations)
        _setup_user_in_db(mock_db_session, user)
        token = create_mock_token(user.auth_id, "investor_relations")
        response = await test_client.get("/test/sales", headers=auth_header(token))
        assert response.status_code == 403
