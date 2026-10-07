"""Fresh registration through durable pod/calendar allocation in an opt-in DB.

Email delivery and background workers are isolated; OTP validation, password
login, business services, SQL records and signed session tokens are real.
"""

import os
import uuid
from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.errors import Conflict
from app.core.rbac import Actor
from app.models.billing import Plan, Subscription
from app.models.enums import AccountStatus, UserRole
from app.models.tenant import Agency
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, ContentCalendar, Task
from app.routers import auth
from app.routers.admin import FixClientPlanRequest, fix_client_plan
from app.schemas.onboarding import QuestionnaireSubmitRequest
from app.services import onboarding_service as onboarding

TEST_URL = os.environ.get("CREO_TEST_DATABASE_URL")


@pytest.mark.skipif(not TEST_URL, reason="explicit test database required")
@pytest.mark.asyncio
async def test_new_client_registration_pricing_onboarding_and_allocation(monkeypatch):
    engine = create_async_engine(TEST_URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            outer = await conn.begin()
            db = AsyncSession(
                bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            try:
                tag = uuid.uuid4().hex
                email = f"fresh-{tag}@example.com"
                password = f"Workflow!Aa9{tag}"
                otp, pending, delivered = {}, {}, {}

                async def save_otp(key, value):
                    otp[key] = list(value)

                async def load_otp(key):
                    return list(otp[key]) if key in otp else None

                async def delete_otp(key):
                    otp.pop(key, None)

                async def save_pending(key, value):
                    pending[key] = value

                async def load_pending(key):
                    return pending.get(key)

                async def delete_pending(key):
                    pending.pop(key, None)

                async def deliver(key, code):
                    delivered[key] = code

                for name, replacement in {
                    "_save_otp": save_otp,
                    "_load_otp": load_otp,
                    "_delete_otp": delete_otp,
                    "_save_pending_registration": save_pending,
                    "_load_pending_registration": load_pending,
                    "_delete_pending_registration": delete_pending,
                    "_deliver_otp_or_raise": deliver,
                }.items():
                    monkeypatch.setattr(auth, name, replacement)
                monkeypatch.setattr(auth, "_check_rate_limit", lambda *a, **kw: True)
                monkeypatch.setattr(onboarding, "schedule_brand_enrichment", lambda *a: None)
                monkeypatch.setattr(onboarding, "schedule_client_dispatch", lambda *a: None)

                await auth.register_intent(
                    auth.RegisterIntentRequest(
                        email=email, password=password, full_name="Fresh Client"
                    ),
                    db,
                )
                assert (
                    await db.execute(select(User).where(User.email == email))
                ).scalar_one_or_none() is None
                registered = await auth.verify_registration(
                    auth.VerifyRegistrationRequest(email=email, code=delivered[email]), db
                )
                client_id = uuid.UUID(registered["user"]["id"])
                login = await auth.login(auth.LoginRequest(email=email, password=password), db)
                assert login["user"]["id"] == str(client_id)
                assert login["access_token"]
                from app.core.security import decode_token

                claims = decode_token(login["access_token"], expected_type="access")
                assert claims["sub"] == str(client_id) and claims["role"] == "client"
                client = await db.get(User, client_id)
                assert client.email_verified_at is not None and client.role == UserRole.CLIENT
                assert client.hashed_password != password

                agency = Agency(id=uuid.uuid4(), name="Isolated Workflow", slug=f"audit-{tag}")
                db.add(agency)
                await db.flush()
                client.agency_id = agency.id
                people = {}
                for role in (
                    UserRole.ADMIN,
                    UserRole.TEAM_LEAD,
                    UserRole.EDITOR,
                    UserRole.DESIGNER,
                ):
                    user = User(
                        id=uuid.uuid4(),
                        agency_id=agency.id,
                        auth_id=f"{role}-{tag}",
                        email=f"{role}-{tag}@example.com",
                        full_name=role.value,
                        role=role,
                        account_status=AccountStatus.ACTIVE,
                    )
                    people[role] = user
                    db.add(user)
                await db.flush()
                for role in (UserRole.EDITOR, UserRole.DESIGNER):
                    db.add(
                        StaffProfile(
                            user_id=people[role].id,
                            agency_id=agency.id,
                            team_lead_id=people[UserRole.TEAM_LEAD].id,
                            is_accepting_work=True,
                            department="video" if role == UserRole.EDITOR else "design",
                            skills=["video" if role == UserRole.EDITOR else "design"],
                        )
                    )
                untouched = Plan(
                    id=uuid.uuid4(),
                    name=f"public-{tag}",
                    display_name="Other package",
                    monthly_price=Decimal("50000"),
                    price_minor=5000000,
                    currency="INR",
                )
                db.add(untouched)
                await db.commit()
                actor = Actor(
                    user_id=people[UserRole.ADMIN].id, role=UserRole.ADMIN, agency_id=agency.id
                )
                await fix_client_plan(
                    client_id,
                    FixClientPlanRequest(
                        is_custom=True,
                        custom_price=Decimal("35000"),
                        custom_reel_quota=8,
                        custom_poster_quota=12,
                        custom_story_quota=10,
                    ),
                    db,
                    actor,
                )
                subscription = (
                    await db.execute(
                        select(Subscription).where(Subscription.client_id == client_id)
                    )
                ).scalar_one()
                assert subscription.amount == Decimal("35000")
                await db.refresh(untouched)
                assert untouched.monthly_price == Decimal("50000")
                profile = await db.get(ClientProfile, client_id)
                assert profile.onboarding_completed_at is None
                await onboarding.accept_terms(db, client_id, "audit-v1")
                with pytest.raises(Conflict):
                    await onboarding.submit_questionnaire(
                        db, client_id, QuestionnaireSubmitRequest()
                    )
                await onboarding.save_questionnaire_sections(
                    db,
                    client_id,
                    {
                        "a": {"brand_name": "Actual Test Brand"},
                        "b": {"ideal_customer": "Local customers"},
                        "c": {"humour": 0},
                        "d": {"visual_direction": "Minimal"},
                        "e": {"on_camera": False},
                    },
                    "e",
                )
                await db.refresh(profile)
                profile.brand_dna = {"identity": {"name": "Actual Test Brand"}}
                await db.commit()
                completed = await onboarding.complete_onboarding(db, client_id)
                assert completed.status == "completed"
                assignments = (
                    (
                        await db.execute(
                            select(ClientAssignment).where(ClientAssignment.client_id == client_id)
                        )
                    )
                    .scalars()
                    .all()
                )
                assert {a.role: a.user_id for a in assignments} == {
                    "team_lead": people[UserRole.TEAM_LEAD].id,
                    "video_editor": people[UserRole.EDITOR].id,
                    "graphic_designer": people[UserRole.DESIGNER].id,
                }
                slots = (
                    (
                        await db.execute(
                            select(ContentCalendar).where(ContentCalendar.client_id == client_id)
                        )
                    )
                    .scalars()
                    .all()
                )
                assert len(slots) == 30 and len({s.publish_date for s in slots}) == 30
                assert {
                    kind: sum(s.slot_kind == kind for s in slots)
                    for kind in ("reel", "poster", "story")
                } == {"reel": 8, "poster": 12, "story": 10}
                original_ids = {s.id for s in slots}
                await onboarding.complete_onboarding(db, client_id)
                retried = (
                    (
                        await db.execute(
                            select(ContentCalendar).where(ContentCalendar.client_id == client_id)
                        )
                    )
                    .scalars()
                    .all()
                )
                assert {s.id for s in retried} == original_ids
                assert (
                    await db.execute(select(func.count(Task.id)).where(Task.client_id == client_id))
                ).scalar_one() == 30
            finally:
                await db.close()
                await outer.rollback()
    finally:
        await engine.dispose()
