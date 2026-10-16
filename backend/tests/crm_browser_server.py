"""Local-only browser fixture server. Authentication is stubbed only in this test app."""

import os
from urllib.parse import urlparse

_test_url = os.getenv("CRM_BROWSER_TEST_DATABASE_URL", "")
_parsed = urlparse(_test_url)
if _parsed.hostname not in {"127.0.0.1", "localhost"} or not _parsed.path.startswith("/creo_test_"):
    raise RuntimeError(
        "CRM_BROWSER_TEST_DATABASE_URL must point to a disposable localhost creo_test_* database"
    )
os.environ["DATABASE_URL"] = _test_url
os.environ["DIRECT_DATABASE_URL"] = _test_url
os.environ["ENVIRONMENT"] = "test"

import base64
import json
import uuid
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.rbac import Actor, get_current_actor
from app.core.errors import AppError
from app.db.session import async_session_factory, tenant_session, get_db
from app.models.user import User, StaffProfile
from app.models.tenant import Agency
from app.models.enums import UserRole, AccountStatus
from app.routers import revenue_crm

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5181"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
AGENCY = uuid.UUID("ec000000-0000-0000-0000-000000000001")
IDS = {
    "bde": uuid.UUID("ec000000-0000-0000-0000-000000000002"),
    "bde_head": uuid.UUID("ec000000-0000-0000-0000-000000000003"),
    "admin": uuid.UUID("ec000000-0000-0000-0000-000000000004"),
}


async def actor(request: Request):
    token = request.headers.get("Authorization", "Bearer x.e30.x").split(" ")[-1]
    data = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "==="))
    role = data.get("test_role", "bde")
    return Actor(user_id=IDS[role], role=UserRole(role), agency_id=AGENCY)


async def database():
    async with async_session_factory() as db:
        async with tenant_session(db, AGENCY):
            yield db


app.dependency_overrides[get_current_actor] = actor
app.dependency_overrides[get_db] = database


@app.exception_handler(AppError)
async def errors(request, error):
    return JSONResponse(
        {"error": {"code": error.code, "message": error.message}}, status_code=error.status_code
    )


@app.get("/api/v1/auth/me")
async def me(actor: Actor = Depends(actor)):
    return {
        "id": str(actor.user_id),
        "role": str(actor.role),
        "full_name": "Test " + str(actor.role),
        "email": "test@example.test",
        "account_status": "active",
        "onboarding_stage": 8,
        "must_reset_password": False,
    }


@app.get("/api/v1/notifications")
async def notifications():
    return {"items": [], "unread_count": 0, "total": 0}


app.include_router(revenue_crm.router, prefix="/api/v1")
app.include_router(revenue_crm.public_router, prefix="/api/v1")


@app.on_event("startup")
async def seed():
    async with async_session_factory() as db:
        if not await db.get(Agency, AGENCY):
            db.add(Agency(id=AGENCY, name="Creo Test Studio", slug=str(AGENCY), status="active"))
            await db.flush()
            for role, user_id in IDS.items():
                db.add(
                    User(
                        id=user_id,
                        agency_id=AGENCY,
                        auth_id=str(user_id),
                        email=str(user_id) + "@example.test",
                        full_name="Test " + role,
                        role=UserRole(role),
                        account_status=AccountStatus.ACTIVE,
                    )
                )
            await db.flush()
            db.add(
                StaffProfile(
                    user_id=IDS["bde"],
                    agency_id=AGENCY,
                    team_lead_id=IDS["bde_head"],
                    department="sales",
                )
            )
            await db.commit()
