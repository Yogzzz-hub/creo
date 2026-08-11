import asyncio
import uuid
import sys
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from core.database import get_db
from models.user import User
from models.enums import UserRole, AccountStatus
from models.platform_settings import PlatformSettings

# Setup mock DB session
mock_db_session = AsyncMock()

async def override_get_db():
    yield mock_db_session

app.dependency_overrides[get_db] = override_get_db

def create_mock_token(user_id: str, role: str) -> str:
    # A fake function to generate JWT if needed, but since auth middleware
    # is complex, we might just bypass or mock `get_current_user`.
    pass

# Mock get_current_user directly to inject different roles
from core.security import get_current_user

async def mock_get_current_user_admin():
    return User(id=str(uuid.uuid4()), role=UserRole.admin, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_super_admin():
    return User(id=str(uuid.uuid4()), role=UserRole.super_admin, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_client():
    return User(id=str(uuid.uuid4()), role=UserRole.client, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_team_member():
    return User(id=str(uuid.uuid4()), role=UserRole.team_member, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_team_lead():
    return User(id=str(uuid.uuid4()), role=UserRole.team_lead, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_sales():
    return User(id=str(uuid.uuid4()), role=UserRole.sales, account_status=AccountStatus.active, deleted_at=None)

async def mock_get_current_user_investor_relations():
    return User(id=str(uuid.uuid4()), role=UserRole.investor_relations, account_status=AccountStatus.active, deleted_at=None)

# Set up mock execute for DB
settings_result = MagicMock()
settings_result.scalar_one_or_none.return_value = PlatformSettings(id="default", sla_delivery_days=3, sla_revision_hours=48)
mock_db_session.execute.return_value = settings_result

async def run_tests():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        roles_to_test = {
            "admin": (mock_get_current_user_admin, 200),
            "super_admin": (mock_get_current_user_super_admin, 200),
            "client": (mock_get_current_user_client, 403),
            "team_member": (mock_get_current_user_team_member, 403),
            "team_lead": (mock_get_current_user_team_lead, 403),
            "sales": (mock_get_current_user_sales, 403),
            "investor_relations": (mock_get_current_user_investor_relations, 403)
        }

        print("AUTHORIZATION VERIFICATION:")
        for role_name, (mock_dep, expected_status) in roles_to_test.items():
            app.dependency_overrides[get_current_user] = mock_dep
            resp = await ac.get("/api/v1/admin/settings")
            status = resp.status_code
            result = "PASS" if status == expected_status else f"FAIL (Got {status}, expected {expected_status})"
            print(f"- {role_name}: {result}")

        # Check response content for admin
        app.dependency_overrides[get_current_user] = mock_get_current_user_admin
        resp = await ac.get("/api/v1/admin/settings")
        data = resp.json()
        print("\nAPI RESPONSE VERIFICATION:")
        print("Response data:", data)
        
        # Verify safe metadata
        config = data.get("config", {})
        integrations = config.get("integrations", {})
        safe_keys = ["razorpay", "stripe", "msg91", "resend", "openai", "instagram", "supabase", "redis", "celery"]
        
        has_secrets = False
        secret_keys_to_check = ["RAZORPAY_KEY_SECRET", "STRIPE_SECRET_KEY", "OPENAI_API_KEY", "SECRET_KEY"]
        response_str = str(data)
        
        # Checking for any potential leak
        for secret in secret_keys_to_check:
            if secret in response_str:
                has_secrets = True
        
        print("Metadata contains expected boolean keys:", all(k in integrations for k in safe_keys))
        print("SECRET SAFETY:")
        print("Secrets exposed:", has_secrets)

if __name__ == "__main__":
    asyncio.run(run_tests())
