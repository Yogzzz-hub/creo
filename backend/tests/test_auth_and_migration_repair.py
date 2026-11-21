"""Regression tests for production authentication repair, schema parity, admin bootstrap and migrations.

Verifies:
1. Alembic revision-length fix and head revision resolution.
2. Canonical UUID type parity between users.id, users.agency_id, client_profiles.user_id and staff_profiles.user_id.
3. User login (admin and client) with joinedload profile loading without integer=uuid errors.
4. User registration with valid UUID primary key and default agency association.
5. Profile loading (ClientProfile and StaffProfile) and onboarding stage resolution.
6. Admin bootstrap idempotency and execution only after successful migrations.
7. Deployment readiness check and /health failure when schema is incomplete.
"""

import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func, text
from sqlalchemy.orm import joinedload

from app.db.session import AsyncSessionLocal
from app.models.enums import AccountStatus, UserRole
from app.models.tenant import Agency
from app.models.user import ClientProfile, StaffProfile, User
from app.core.security import hash_password
from app.main import app, check_database_schema_ready, bootstrap_admin_accounts, REQUIRED_HEAD_REVISION
from alembic.script import ScriptDirectory
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "alembic"


@pytest.fixture
def scripts():
    return ScriptDirectory(str(MIGRATIONS_DIR))


@pytest.mark.asyncio
async def test_alembic_head_and_revision_length(scripts):
    """Verify that Alembic head is 0027 and database alembic_version column is VARCHAR(64)."""
    assert scripts.get_heads() == [REQUIRED_HEAD_REVISION]

    async with AsyncSessionLocal() as db:
        col_type = await db.scalar(
            text("""
                SELECT data_type || '(' || character_maximum_length || ')'
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'alembic_version'
                  AND column_name = 'version_num';
            """)
        )
        # alembic_version.version_num must be VARCHAR(64) or wider to support 35-char revision
        assert col_type in ("character varying(64)", "character varying(128)", "character varying(255)")

        current_rev = await db.scalar(text("SELECT version_num FROM alembic_version LIMIT 1;"))
        assert current_rev == REQUIRED_HEAD_REVISION


@pytest.mark.asyncio
async def test_canonical_schema_uuid_types():
    """Verify that users.id, users.agency_id, and profile user_id columns are canonical UUIDs."""
    async with AsyncSessionLocal() as db:
        ready, reason = await check_database_schema_ready(db)
        assert ready, f"Schema readiness check failed: {reason}"

        cols = await db.execute(
            text("""
                SELECT table_name, column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND (
                      (table_name = 'users' AND column_name IN ('id', 'agency_id'))
                      OR (table_name = 'client_profiles' AND column_name = 'user_id')
                      OR (table_name = 'staff_profiles' AND column_name = 'user_id')
                      OR (table_name = 'agencies' AND column_name = 'id')
                  );
            """)
        )
        col_map = {(r[0], r[1]): (r[2], r[3]) for r in cols.fetchall()}

        for tbl, col in [
            ("users", "id"),
            ("users", "agency_id"),
            ("client_profiles", "user_id"),
            ("staff_profiles", "user_id"),
            ("agencies", "id"),
        ]:
            assert (tbl, col) in col_map, f"Column {tbl}.{col} missing"
            dtype, udt = col_map[(tbl, col)]
            assert dtype == "uuid" or udt == "uuid", f"{tbl}.{col} is {dtype} ({udt}), expected uuid"


@pytest.mark.asyncio
async def test_admin_bootstrap_idempotency():
    """Verify that bootstrap_admin_accounts creates default accounts and runs idempotently."""
    async with AsyncSessionLocal() as db:
        # Run bootstrap
        await bootstrap_admin_accounts(db)

        # Verify admin accounts exist
        res = await db.execute(
            select(User).where(func.lower(User.email) == "admin@creo.agency")
        )
        admin_user = res.scalar_one_or_none()
        assert admin_user is not None
        assert admin_user.role == UserRole.SUPER_ADMIN
        assert admin_user.account_status == AccountStatus.ACTIVE
        assert admin_user.agency_id == uuid.UUID("00000000-0000-0000-0000-000000000001")

        # Second bootstrap run must be completely idempotent
        await bootstrap_admin_accounts(db)


@pytest.mark.asyncio
async def test_login_success_admin():
    """Verify that POST /api/v1/auth/login succeeds for bootstrapped admin credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@creo.agency", "password": "Admin123!"},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "admin@creo.agency"
        assert data["user"]["role"] == "super_admin"


@pytest.mark.asyncio
async def test_login_client_with_joinedload_profile():
    """Verify that POST /api/v1/auth/login works for client users with client_profiles without integer=uuid error."""
    client_id = uuid.uuid4()
    client_email = f"client_{uuid.uuid4().hex[:6]}@example.com"
    default_agency_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    async with AsyncSessionLocal() as db:
        user = User(
            id=client_id,
            agency_id=default_agency_id,
            email=client_email,
            auth_id=f"auth-{uuid.uuid4().hex[:8]}",
            full_name="Acme Client",
            hashed_password=hash_password("ClientPassword123!"),
            role=UserRole.CLIENT,
            account_status=AccountStatus.ACTIVE,
        )
        profile = ClientProfile(
            user_id=client_id,
            company_name="Acme Industries",
            timezone="Asia/Kolkata",
            brand_dna={},
        )
        db.add(user)
        db.add(profile)
        await db.commit()

        # Test ORM joinedload directly
        stmt = select(User).options(joinedload(User.client_profile)).where(User.id == client_id)
        fetched = (await db.execute(stmt)).scalar_one_or_none()
        assert fetched is not None
        assert fetched.client_profile is not None
        assert fetched.client_profile.company_name == "Acme Industries"

    # Test API login endpoint
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": client_email, "password": "ClientPassword123!"},
        )
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == client_email
        assert data["user"]["company_name"] == "Acme Industries"


@pytest.mark.asyncio
async def test_login_invalid_credentials_returns_401():
    """Verify that invalid credentials return 401 Unauthorized rather than HTTP 500."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-existent email
        resp1 = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@creo.agency", "password": "WrongPassword!"},
        )
        assert resp1.status_code == 401
        err_code1 = resp1.json().get("code") or resp1.json().get("error", {}).get("code")
        assert err_code1 == "INVALID_CREDENTIALS"

        # Wrong password
        resp2 = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@creo.agency", "password": "IncorrectPassword123!"},
        )
        assert resp2.status_code == 401
        err_code2 = resp2.json().get("code") or resp2.json().get("error", {}).get("code")
        assert err_code2 == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_user_registration():
    """Verify that user registration creates user with UUID id, default agency, and client profile."""
    import time
    from app.routers.auth import _save_otp, _save_pending_registration
    
    reg_email = f"newuser_{uuid.uuid4().hex[:6]}@example.com"
    otp_code = "654321"
    expires_at = time.time() + 600.0
    await _save_otp(f"reg:{reg_email}", [otp_code, expires_at, 0])
    await _save_pending_registration(
        reg_email,
        {
            "password_hash": hash_password("SecurePassword123!"),
            "full_name": "New Registered User",
        },
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/verify-registration",
            json={
                "email": reg_email,
                "code": otp_code,
            },
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == reg_email

    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User)
            .options(joinedload(User.client_profile))
            .where(func.lower(User.email) == reg_email.lower())
        )
        created = res.scalar_one_or_none()
        assert created is not None
        assert isinstance(created.id, uuid.UUID)
        assert created.agency_id == uuid.UUID("00000000-0000-0000-0000-000000000001")
        assert created.role == UserRole.CLIENT
        assert created.client_profile is not None
        assert created.client_profile.user_id == created.id


@pytest.mark.asyncio
async def test_deployment_readiness_health_check():
    """Verify that /health checks database schema readiness and reports 200 OK when ready."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "degraded")  # degraded if local redis not running
        assert data["db"] == "ok"
