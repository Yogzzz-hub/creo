"""End-to-end money flows against a real PostgreSQL schema (bargain, checkout, offline payment, bypass).

These drive the real FastAPI app over ASGI, so routing, auth, SQL, constraints and the
unique-active-subscription index are all exercised. Razorpay itself is faked.

They need a throw-away PostgreSQL database that has been migrated (`alembic upgrade head`):

    DATABASE_URL=postgresql+asyncpg://postgres@localhost:5433/creo_test \
    DIRECT_DATABASE_URL=$DATABASE_URL REDIS_URL=fakeredis:// JWT_SECRET=x ENVIRONMENT=test \
    pytest tests/test_money_flows.py

Without one (or if the database name does not contain "test", to protect real data) the
whole module is skipped.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.config import settings
from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal
from app.models.billing import Plan, Subscription, UsageCounter
from app.models.enums import (
    AccountStatus,
    DeliverableType,
    PaymentProvider,
    SubscriptionStatus,
    UserRole,
)
from app.models.tenant import Agency
from app.models.user import ClientProfile, User
from app.services import email_service, payment_service, razorpay_orders

pytestmark = pytest.mark.asyncio

KEY_SECRET = "rzp_test_secret_for_tests"
WEBHOOK_SECRET = "whsec_real_test_secret"
AGENCY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
RUN = uuid.uuid4().hex[:8]  # the database outlives a run: keep gateway ids unique per run


# ── environment guard ────────────────────────────────────────────────────────


def _database_ready() -> bool:
    import asyncio

    url = settings.DATABASE_URL or ""
    if not url.startswith("postgresql") or "test" not in url.rsplit("/", 1)[-1]:
        return False

    async def probe() -> bool:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1 FROM v_client_onboarding LIMIT 1"))
                await db.execute(text("SELECT 1 FROM manual_payment_requests LIMIT 1"))
                await db.execute(text("SELECT agreed_amount FROM plan_negotiations LIMIT 1"))
            return True
        except Exception:
            return False

    return asyncio.run(probe())


if not _database_ready():  # pragma: no cover - environment dependent
    pytest.skip("needs a migrated throw-away PostgreSQL test database", allow_module_level=True)

from app.main import app  # noqa: E402  (import after the guard: it connects on import)
import app.main as app_main  # noqa: E402


# ── fixtures ─────────────────────────────────────────────────────────────────


class FakeRazorpay:
    """Records the orders the app creates so signatures and amounts can be checked."""

    def __init__(self) -> None:
        self.orders: dict[str, dict] = {}

    async def create(self, key_id, key_secret, amount_minor, currency):
        order_id = f"order_{uuid.uuid4().hex[:14]}"
        self.orders[order_id] = {"amount": amount_minor, "currency": currency}
        return order_id

    async def fetch(self, key_id, key_secret, order_id):
        return self.orders.get(order_id)


@pytest.fixture(autouse=True)
def gateway(monkeypatch):
    fake = FakeRazorpay()
    monkeypatch.setattr(razorpay_orders, "create_razorpay_order", fake.create)
    monkeypatch.setattr(razorpay_orders, "fetch_razorpay_order", fake.fetch, raising=False)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", KEY_SECRET)
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")  # real signature checks

    async def sent(*args, **kwargs):
        return True

    for name in (
        "send_payment_approved_email",
        "send_payment_rejected_email",
        "send_payment_verification_request_email",
    ):
        monkeypatch.setattr(email_service, name, sent)
    app_main._ip_request_timestamps.clear()
    return fake


@pytest_asyncio.fixture
async def http():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def plans():
    """The three public tiers (shared by every test; created once)."""
    out: dict[str, Plan] = {}
    async with AsyncSessionLocal() as db:
        for name, price, reels, posters, stories in [
            ("starter", 25000, 4, 8, 10),
            ("growth", 50000, 8, 12, 15),
            ("scale", 100000, 16, 24, 30),
        ]:
            plan = (await db.execute(select(Plan).where(Plan.name == name))).scalar_one_or_none()
            if plan is None:
                plan = Plan(
                    agency_id=AGENCY_ID, name=name, display_name=name.title(), monthly_price=Decimal(price),
                    price_minor=price * 100, currency="INR", reel_quota=reels, poster_quota=posters,
                    story_quota=stories, highlights=[], is_active=True,
                )
                db.add(plan)
                await db.commit()
                await db.refresh(plan)
            out[name] = plan
    return out


async def make_user(role: UserRole = UserRole.CLIENT, agency_id: uuid.UUID | None = AGENCY_ID) -> User:
    suffix = uuid.uuid4().hex[:10]
    async with AsyncSessionLocal() as db:
        user = User(
            auth_id=f"auth-test-{suffix}", email=f"{role.value}-{suffix}@example.com", full_name=f"{role.value} {suffix}",
            role=role, account_status=AccountStatus.ACTIVE, email_verified_at=datetime.now(UTC), agency_id=agency_id,
        )
        db.add(user)
        await db.flush()
        if role == UserRole.CLIENT:
            db.add(ClientProfile(user_id=user.id, terms_accepted_at=datetime.now(UTC)))
        await db.commit()
        await db.refresh(user)
        return user


def auth(user: User) -> dict[str, str]:
    token = create_access_token(
        subject=user.id, role=user.role.value, email=user.email,
        client_id=user.id if user.role == UserRole.CLIENT else None,
        agency_id=user.agency_id, token_version=user.token_version,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def client_user(plans):
    return await make_user(UserRole.CLIENT)


@pytest_asyncio.fixture
async def admin_user(plans):
    return await make_user(UserRole.ADMIN)


def sign(order_id: str, payment_id: str, secret: str = KEY_SECRET) -> str:
    return hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


async def active_subs(client_id: uuid.UUID) -> list[Subscription]:
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(Subscription).where(
                Subscription.client_id == client_id,
                Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
            )
        )
        return list(rows.scalars().all())


async def all_subs(client_id: uuid.UUID) -> list[Subscription]:
    async with AsyncSessionLocal() as db:
        return list((await db.execute(select(Subscription).where(Subscription.client_id == client_id))).scalars().all())


async def quotas(client_id: uuid.UUID) -> dict[str, tuple[int, int]]:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(UsageCounter).where(UsageCounter.client_id == client_id))).scalars().all()
        return {c.kind.value: (c.quota, c.used) for c in rows}


async def manual_requests(client_id: uuid.UUID) -> list[str]:
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            text("SELECT status FROM manual_payment_requests WHERE client_id = :c ORDER BY created_at"), {"c": client_id}
        )
        return [r[0] for r in rows.fetchall()]


async def bargain(http, client_user, offer: str | None = "₹30,000") -> str:
    """Client books a bargain call; returns the negotiation id."""
    res = await http.post(
        "/api/v1/portal/book-call", headers=auth(client_user),
        json={"phone_number": "+91 99999 00000", "proposed_offer": offer, "notes": "bargain"},
    )
    assert res.status_code == 200, res.text
    return await negotiation_id_for(client_user)


async def negotiation_id_for(client_user) -> str:
    async with AsyncSessionLocal() as db:
        row = await db.execute(
            text("SELECT id FROM plan_negotiations WHERE client_id = :c ORDER BY created_at DESC LIMIT 1"),
            {"c": client_user.id},
        )
        return str(row.scalar_one())


async def admin_decides(http, admin, neg_id, **payload):
    return await http.patch(f"/api/v1/admin/negotiations/{neg_id}", headers=auth(admin), json=payload)


async def client_plans(http, client_user) -> list[dict]:
    res = await http.get("/api/v1/payments/plans", headers=auth(client_user))
    assert res.status_code == 200, res.text
    return res.json()


async def checkout(http, client_user, plan_id) -> dict:
    res = await http.post("/api/v1/payments/orders", headers=auth(client_user), json={"plan_id": str(plan_id), "gateway": "razorpay"})
    assert res.status_code == 200, res.text
    return res.json()


async def pay(http, client_user, order: dict, *, signature: str | None = None):
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    return await http.post(
        "/api/v1/payments/confirm", headers=auth(client_user),
        json={
            "order_id": order["order_id"], "gateway": "razorpay", "payment_id": payment_id,
            "signature": signature if signature is not None else sign(order["order_id"], payment_id),
        },
    )


# ── the original bug: the plans list returned 500 for every signed-in client ──


async def test_plans_list_works_for_a_signed_in_client(http, client_user, plans):
    shown = await client_plans(http, client_user)
    assert {p["name"] for p in shown} == {"starter", "growth", "scale"}


async def test_plans_list_is_public_for_visitors(http, plans):
    res = await http.get("/api/v1/payments/plans")
    assert res.status_code == 200 and len(res.json()) == 3


async def test_a_stranger_cannot_read_a_clients_negotiated_plan(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    assert (await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000)).status_code == 200

    anonymous = await http.get("/api/v1/payments/plans", params={"client_id": str(client_user.id)})
    other_client = await make_user()
    nosy = await http.get("/api/v1/payments/plans", params={"client_id": str(client_user.id)}, headers=auth(other_client))
    for res in (anonymous, nosy):
        assert {p["name"] for p in res.json()} == {"starter", "growth", "scale"}


async def test_an_admin_can_preview_a_clients_negotiated_plan(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000)
    res = await http.get("/api/v1/payments/plans", params={"client_id": str(client_user.id)}, headers=auth(admin_user))
    assert [float(p["monthly_price"]) for p in res.json()] == [30000.0]


# ── bargain → negotiated price → pay online ──────────────────────────────────


async def test_bargain_accept_then_pay_online_activates_the_negotiated_plan(http, client_user, admin_user, gateway):
    neg = await bargain(http, client_user)

    pending = (await http.get("/api/v1/admin/negotiations", headers=auth(admin_user))).json()
    assert any(n["id"] == neg and n["status"] == "Pending Review" for n in pending)

    res = await admin_decides(
        http, admin_user, neg, action="accept", agreed_price=30000, reel_quota=5, poster_quota=7, story_quota=9,
    )
    assert res.status_code == 200 and res.json()["new_status"] == "Accepted"

    # The client now sees ONLY their negotiated plan, at the negotiated price.
    shown = await client_plans(http, client_user)
    assert len(shown) == 1 and float(shown[0]["monthly_price"]) == 30000.0 and shown[0]["price_minor"] == 3_000_000

    order = await checkout(http, client_user, shown[0]["id"])
    assert order["amount_minor"] == 3_000_000 and gateway.orders[order["order_id"]]["amount"] == 3_000_000

    # Not paid yet: nothing is active.
    assert await active_subs(client_user.id) == []

    res = await pay(http, client_user, order)
    assert res.status_code == 200 and res.json()["status"] == "active"

    (sub,) = await active_subs(client_user.id)
    assert sub.amount == Decimal("30000.00") and sub.gateway == PaymentProvider.RAZORPAY
    assert await quotas(client_user.id) == {"reel": (5, 0), "static_post": (7, 0), "carousel": (9, 0)}


async def test_a_forged_checkout_signature_never_activates_a_plan(http, client_user, plans, monkeypatch):
    order = await checkout(http, client_user, plans["growth"].id)
    # Do not wait the full 6s for a webhook that will never come.
    monkeypatch.setattr(payment_service, "CONFIRM_POLL_SECONDS", 0.1, raising=False)
    res = await pay(http, client_user, order, signature="0" * 64)
    assert res.json()["status"] == "pending"
    assert await active_subs(client_user.id) == []


async def test_a_signature_for_someone_elses_secret_is_rejected(http, client_user, plans, monkeypatch):
    order = await checkout(http, client_user, plans["growth"].id)
    monkeypatch.setattr(payment_service, "CONFIRM_POLL_SECONDS", 0.1, raising=False)
    payment_id = f"pay_attacker_{RUN}"
    res = await pay(http, client_user, order, signature=sign(order["order_id"], payment_id, secret="guess"))
    assert res.json()["status"] == "pending" and await active_subs(client_user.id) == []


async def test_confirming_twice_does_not_extend_the_period_or_duplicate(http, client_user, plans):
    order = await checkout(http, client_user, plans["starter"].id)
    payment_id = f"pay_once_{RUN}"
    body = {"order_id": order["order_id"], "gateway": "razorpay", "payment_id": payment_id, "signature": sign(order["order_id"], payment_id)}
    first = await http.post("/api/v1/payments/confirm", headers=auth(client_user), json=body)
    (sub,) = await active_subs(client_user.id)
    second = await http.post("/api/v1/payments/confirm", headers=auth(client_user), json=body)
    assert first.json()["status"] == second.json()["status"] == "active"
    (again,) = await active_subs(client_user.id)
    assert again.id == sub.id and again.current_period_end == sub.current_period_end


async def test_a_client_cannot_confirm_another_clients_order(http, client_user, plans):
    order = await checkout(http, client_user, plans["starter"].id)
    thief = await make_user()
    res = await pay(http, thief, order)
    assert res.status_code == 403 and await active_subs(client_user.id) == []


async def test_upgrading_replaces_the_old_plan_without_hitting_the_unique_index(http, client_user, plans):
    """Two active subscriptions per client are forbidden by a unique index: the old one must go first."""
    for _ in range(6):  # row order in one UPDATE flush is arbitrary, so repeat
        user = await make_user()
        first = await checkout(http, user, plans["starter"].id)
        assert (await pay(http, user, first)).json()["status"] == "active"
        second = await checkout(http, user, plans["scale"].id)
        res = await pay(http, user, second)
        assert res.status_code == 200 and res.json()["status"] == "active"
        (sub,) = await active_subs(user.id)
        assert sub.plan_id == plans["scale"].id


async def test_downgrading_mid_month_never_pushes_used_above_quota(http, client_user, plans):
    first = await checkout(http, client_user, plans["scale"].id)
    await pay(http, client_user, first)
    async with AsyncSessionLocal() as db:
        counter = (await db.execute(select(UsageCounter).where(
            UsageCounter.client_id == client_user.id, UsageCounter.kind == DeliverableType.REEL))).scalar_one()
        counter.used = 10
        await db.commit()
    second = await checkout(http, client_user, plans["starter"].id)  # 4 reels < 10 used
    res = await pay(http, client_user, second)
    assert res.status_code == 200
    assert (await quotas(client_user.id))["reel"] == (10, 10)


async def test_buying_the_same_plan_twice_is_refused_in_production(http, client_user, plans):
    order = await checkout(http, client_user, plans["growth"].id)
    await pay(http, client_user, order)
    again = await http.post("/api/v1/payments/orders", headers=auth(client_user), json={"plan_id": str(plans["growth"].id), "gateway": "razorpay"})
    assert again.status_code == 409


# ── counter-offer, decline, edge cases ───────────────────────────────────────


async def test_counter_offer_replaces_the_plan_list_with_the_counter(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    res = await admin_decides(http, admin_user, neg, action="counter", counter_price=40000, counter_note="best we can do")
    assert res.status_code == 200 and res.json()["new_status"] == "Counter Offered"
    (shown,) = await client_plans(http, client_user)
    assert float(shown["monthly_price"]) == 40000.0 and "Counter" in shown["display_name"]


async def test_declined_negotiation_returns_the_client_to_public_pricing(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000)
    assert len(await client_plans(http, client_user)) == 1
    res = await admin_decides(http, admin_user, neg, action="decline", decline_reason="too low")
    assert res.json()["new_status"] == "Declined"
    assert {p["name"] for p in await client_plans(http, client_user)} == {"starter", "growth", "scale"}


async def test_accept_without_a_price_asks_instead_of_inventing_one(http, client_user, admin_user):
    neg = await bargain(http, client_user, offer="something reasonable")
    res = await admin_decides(http, admin_user, neg, action="accept")
    assert res.status_code == 422
    async with AsyncSessionLocal() as db:
        status = (await db.execute(text("SELECT status FROM plan_negotiations WHERE id = :i"), {"i": neg})).scalar_one()
    assert status == "Pending Review"


@pytest.mark.parametrize("offer,expected", [("50k", 50000.0), ("₹45,000/month", 45000.0), ("1.5 lakh", 150000.0)])
async def test_the_clients_own_offer_is_read_correctly_when_no_price_is_typed(http, client_user, admin_user, offer, expected):
    neg = await bargain(http, client_user, offer=offer)
    assert (await admin_decides(http, admin_user, neg, action="accept")).status_code == 200
    (shown,) = await client_plans(http, client_user)
    assert float(shown["monthly_price"]) == expected


async def test_accepting_after_several_abandoned_checkouts_does_not_crash(http, client_user, admin_user, plans):
    for _ in range(3):  # each "Proceed to checkout" leaves an INCOMPLETE subscription
        await checkout(http, client_user, plans["growth"].id)
    neg = await bargain(http, client_user)
    assert (await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000)).status_code == 200
    neg2 = await bargain(http, client_user)
    assert (await admin_decides(http, admin_user, neg2, action="counter", counter_price=35000)).status_code == 200


async def test_renegotiating_below_what_is_already_used_keeps_the_used_work(http, client_user, admin_user, plans):
    order = await checkout(http, client_user, plans["scale"].id)
    await pay(http, client_user, order)
    async with AsyncSessionLocal() as db:
        counter = (await db.execute(select(UsageCounter).where(
            UsageCounter.client_id == client_user.id, UsageCounter.kind == DeliverableType.REEL))).scalar_one()
        counter.used = 12
        await db.commit()
    neg = await bargain(http, client_user)
    res = await admin_decides(http, admin_user, neg, action="accept", agreed_price=20000, reel_quota=2, poster_quota=2, story_quota=2)
    assert res.status_code == 200
    assert (await quotas(client_user.id))["reel"][1] == 12


async def test_the_legacy_approve_route_honours_decline_instead_of_approving(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    res = await http.patch(f"/api/v1/negotiations/{neg}/approve", headers=auth(admin_user), json={"action": "decline", "decline_reason": "no"})
    assert res.status_code == 200
    async with AsyncSessionLocal() as db:
        status = (await db.execute(text("SELECT status FROM plan_negotiations WHERE id = :i"), {"i": neg})).scalar_one()
    assert status == "Declined"
    assert {p["name"] for p in await client_plans(http, client_user)} == {"starter", "growth", "scale"}


async def test_the_legacy_submit_route_files_a_real_bargain_request(http, client_user, admin_user):
    res = await http.post("/api/v1/negotiations/submit", headers=auth(client_user), json={
        "contact_phone": "9999999999", "preferred_window": "evening", "proposed_budget": "35000"})
    assert res.status_code == 201, res.text
    listed = (await http.get("/api/v1/admin/negotiations", headers=auth(admin_user))).json()
    assert any(n["clientId"] == str(client_user.id) for n in listed)


async def test_an_admin_of_another_agency_cannot_decide_this_negotiation(http, client_user):
    async with AsyncSessionLocal() as db:
        other = Agency(name="Other", slug=f"other-{uuid.uuid4().hex[:8]}")
        db.add(other)
        await db.commit()
        other_id = other.id
    outsider = await make_user(UserRole.ADMIN, agency_id=other_id)
    neg = await bargain(http, client_user)
    res = await admin_decides(http, outsider, neg, action="accept", agreed_price=1000)
    assert res.status_code == 403


# ── offline payment: client claims → admin approves / rejects ────────────────


async def claim(http, client_user, plan_id, method="cash"):
    return await http.post(
        "/api/v1/onboarding/manual-payment-request", headers=auth(client_user),
        json={"plan_id": str(plan_id), "payment_method": method, "reference_note": "paid at office"},
    )


async def test_offline_claim_then_admin_approval_activates_and_seeds_quotas(http, client_user, admin_user, plans):
    res = await claim(http, client_user, plans["growth"].id)
    assert res.status_code == 200, res.text
    request_id = res.json()["id"]

    listed = (await http.get("/api/v1/admin/manual-payments", headers=auth(admin_user))).json()
    assert any(r["id"] == request_id and r["status"] == "PENDING" for r in listed)
    assert await active_subs(client_user.id) == []  # a claim alone grants nothing

    approved = await http.post(f"/api/v1/admin/manual-payments/{request_id}/approve", headers=auth(admin_user), json={"admin_notes": "cash received"})
    assert approved.status_code == 200, approved.text

    (sub,) = await active_subs(client_user.id)
    assert sub.gateway == PaymentProvider.MANUAL and sub.amount == Decimal("50000.00")
    assert await quotas(client_user.id) == {"reel": (8, 0), "static_post": (12, 0), "carousel": (15, 0)}
    assert await manual_requests(client_user.id) == ["APPROVED"]

    # The client is not locked out by being activated.
    me = await http.get("/api/v1/auth/me", headers=auth(client_user))
    assert me.status_code == 200


async def test_approving_the_same_request_twice_is_refused(http, client_user, admin_user, plans):
    request_id = (await claim(http, client_user, plans["starter"].id)).json()["id"]
    url = f"/api/v1/admin/manual-payments/{request_id}/approve"
    assert (await http.post(url, headers=auth(admin_user), json={})).status_code == 200
    second = await http.post(url, headers=auth(admin_user), json={})
    assert second.status_code == 409
    assert len(await active_subs(client_user.id)) == 1


async def test_a_rejected_request_cannot_be_approved_later_and_client_can_still_pay_online(http, client_user, admin_user, plans):
    request_id = (await claim(http, client_user, plans["starter"].id)).json()["id"]
    rejected = await http.post(f"/api/v1/admin/manual-payments/{request_id}/reject", headers=auth(admin_user), json={"admin_notes": "no receipt"})
    assert rejected.status_code == 200 and await manual_requests(client_user.id) == ["REJECTED"]

    again = await http.post(f"/api/v1/admin/manual-payments/{request_id}/approve", headers=auth(admin_user), json={})
    assert again.status_code == 409 and await active_subs(client_user.id) == []

    order = await checkout(http, client_user, plans["starter"].id)
    assert (await pay(http, client_user, order)).json()["status"] == "active"


async def test_an_approved_request_cannot_be_rejected_afterwards(http, client_user, admin_user, plans):
    request_id = (await claim(http, client_user, plans["starter"].id)).json()["id"]
    await http.post(f"/api/v1/admin/manual-payments/{request_id}/approve", headers=auth(admin_user), json={})
    res = await http.post(f"/api/v1/admin/manual-payments/{request_id}/reject", headers=auth(admin_user), json={})
    assert res.status_code == 409 and await manual_requests(client_user.id) == ["APPROVED"]


async def test_resubmitting_a_pending_claim_updates_it_instead_of_duplicating(http, client_user, plans):
    await claim(http, client_user, plans["starter"].id, "cash")
    await claim(http, client_user, plans["scale"].id, "bank_transfer")
    assert await manual_requests(client_user.id) == ["PENDING"]


async def test_a_client_cancelling_their_claim_can_pay_online_instead(http, client_user, plans):
    await claim(http, client_user, plans["starter"].id)
    assert (await http.delete("/api/v1/onboarding/manual-payment-request", headers=auth(client_user))).status_code == 200
    assert await manual_requests(client_user.id) == []
    order = await checkout(http, client_user, plans["starter"].id)
    assert (await pay(http, client_user, order)).json()["status"] == "active"


async def test_an_active_client_cannot_claim_offline_payment(http, client_user, plans):
    order = await checkout(http, client_user, plans["starter"].id)
    await pay(http, client_user, order)
    assert (await claim(http, client_user, plans["scale"].id)).status_code == 400


async def test_offline_claim_for_a_negotiated_plan_uses_the_negotiated_price(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000, reel_quota=3, poster_quota=4, story_quota=5)
    (custom,) = await client_plans(http, client_user)
    request_id = (await claim(http, client_user, custom["id"])).json()["id"]
    assert (await http.post(f"/api/v1/admin/manual-payments/{request_id}/approve", headers=auth(admin_user), json={})).status_code == 200
    (sub,) = await active_subs(client_user.id)
    assert sub.amount == Decimal("30000.00")
    assert await quotas(client_user.id) == {"reel": (3, 0), "static_post": (4, 0), "carousel": (5, 0)}


async def test_agency_admins_only_see_their_own_agencys_claims(http, client_user, admin_user, plans):
    await claim(http, client_user, plans["starter"].id)
    async with AsyncSessionLocal() as db:
        other = Agency(name="Other", slug=f"other-{uuid.uuid4().hex[:8]}")
        db.add(other)
        await db.commit()
        other_id = other.id
    outsider = await make_user(UserRole.ADMIN, agency_id=other_id)
    listed = (await http.get("/api/v1/admin/manual-payments", headers=auth(outsider))).json()
    assert all(r["client_id"] != str(client_user.id) for r in listed)
    request_id = (await http.get("/api/v1/admin/manual-payments", headers=auth(admin_user))).json()[0]["id"]
    assert (await http.post(f"/api/v1/admin/manual-payments/{request_id}/approve", headers=auth(outsider), json={})).status_code == 403


# ── direct bypass and its inverse ────────────────────────────────────────────


async def bypass(http, admin, client_id, plan_id, method="cash"):
    return await http.post(
        f"/api/v1/admin/clients/{client_id}/bypass-payment", headers=auth(admin),
        json={"plan_id": str(plan_id), "payment_method": method, "notes": "paid in person"},
    )


async def test_direct_bypass_then_revoke_then_pay_online(http, client_user, admin_user, plans):
    res = await bypass(http, admin_user, client_user.id, plans["growth"].id)
    assert res.status_code == 200, res.text
    (sub,) = await active_subs(client_user.id)
    assert sub.gateway == PaymentProvider.MANUAL
    assert (await quotas(client_user.id))["reel"] == (8, 0)

    # one bypass at a time
    assert (await bypass(http, admin_user, client_user.id, plans["scale"].id)).status_code == 400

    revoked = await http.post(f"/api/v1/admin/clients/{client_user.id}/revoke-bypass", headers=auth(admin_user))
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["cancelled_subscriptions"] == 1
    assert await active_subs(client_user.id) == []
    assert await manual_requests(client_user.id) == ["CANCELLED"]
    assert set((await quotas(client_user.id)).values()) == {(0, 0)}

    # The client is back at the payment step and can simply pay.
    order = await checkout(http, client_user, plans["growth"].id)
    assert (await pay(http, client_user, order)).json()["status"] == "active"
    (sub,) = await active_subs(client_user.id)
    assert sub.gateway == PaymentProvider.RAZORPAY
    assert (await quotas(client_user.id))["reel"][0] == 8


async def test_bypass_after_a_pending_claim_closes_the_claim(http, client_user, admin_user, plans):
    await claim(http, client_user, plans["starter"].id)
    assert (await bypass(http, admin_user, client_user.id, plans["starter"].id)).status_code == 200
    assert await manual_requests(client_user.id) == ["APPROVED"]
    assert len(await active_subs(client_user.id)) == 1


async def test_bypass_on_a_client_who_already_paid_online_is_refused(http, client_user, admin_user, plans):
    order = await checkout(http, client_user, plans["starter"].id)
    await pay(http, client_user, order)
    res = await bypass(http, admin_user, client_user.id, plans["scale"].id)
    assert res.status_code == 400
    (sub,) = await active_subs(client_user.id)
    assert sub.gateway == PaymentProvider.RAZORPAY


async def test_revoking_cannot_cancel_a_plan_the_client_paid_for(http, client_user, admin_user, plans):
    order = await checkout(http, client_user, plans["starter"].id)
    await pay(http, client_user, order)
    res = await http.post(f"/api/v1/admin/clients/{client_user.id}/revoke-bypass", headers=auth(admin_user))
    assert res.status_code == 409
    assert len(await active_subs(client_user.id)) == 1
    assert (await quotas(client_user.id))["reel"][0] == 4


async def test_revoking_when_there_is_no_bypass_is_a_clear_error(http, client_user, admin_user):
    res = await http.post(f"/api/v1/admin/clients/{client_user.id}/revoke-bypass", headers=auth(admin_user))
    assert res.status_code == 409


async def test_bypass_with_a_negotiated_custom_plan_and_a_bad_plan_id(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    await admin_decides(http, admin_user, neg, action="accept", agreed_price=28000)
    (custom,) = await client_plans(http, client_user)
    assert (await bypass(http, admin_user, client_user.id, custom["id"])).status_code == 200
    (sub,) = await active_subs(client_user.id)
    assert sub.amount == Decimal("28000.00")

    other = await make_user()
    assert (await bypass(http, admin_user, other.id, "not-a-uuid")).status_code == 422
    assert (await bypass(http, admin_user, other.id, uuid.uuid4())).status_code == 404


async def test_a_client_cannot_use_admin_money_endpoints(http, client_user, plans):
    assert (await bypass(http, client_user, client_user.id, plans["starter"].id)).status_code == 403
    assert (await http.get("/api/v1/admin/manual-payments", headers=auth(client_user))).status_code == 403
    assert (await http.post(f"/api/v1/admin/clients/{client_user.id}/revoke-bypass", headers=auth(client_user))).status_code == 403


async def test_an_admin_of_another_agency_cannot_bypass_or_revoke(http, client_user, plans):
    async with AsyncSessionLocal() as db:
        other = Agency(name="Other", slug=f"other-{uuid.uuid4().hex[:8]}")
        db.add(other)
        await db.commit()
        other_id = other.id
    outsider = await make_user(UserRole.ADMIN, agency_id=other_id)
    assert (await bypass(http, outsider, client_user.id, plans["starter"].id)).status_code == 403
    assert (await http.post(f"/api/v1/admin/clients/{client_user.id}/revoke-bypass", headers=auth(outsider))).status_code == 403
    assert await active_subs(client_user.id) == []


# ── webhooks ─────────────────────────────────────────────────────────────────


def webhook_body(event: str, order_id: str, event_id: str | None = None) -> bytes:
    return json.dumps({
        "event": event, "event_id": event_id or f"evt_{uuid.uuid4().hex[:10]}",
        "payload": {"payment": {"entity": {"order_id": order_id}}},
    }).encode()


async def send_webhook(http, body: bytes, secret: str = WEBHOOK_SECRET):
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return await http.post("/api/v1/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"})


async def test_a_captured_payment_webhook_activates_once(http, client_user, plans):
    order = await checkout(http, client_user, plans["growth"].id)
    body = webhook_body("payment.captured", order["order_id"], f"evt_{RUN}")
    assert (await send_webhook(http, body)).status_code == 200
    (sub,) = await active_subs(client_user.id)
    end = sub.current_period_end
    assert (await send_webhook(http, body)).status_code == 200  # Razorpay retries
    (sub,) = await active_subs(client_user.id)
    assert sub.current_period_end == end
    assert (await quotas(client_user.id))["reel"] == (8, 0)


@pytest.mark.parametrize("event", ["payment.failed", "order.created", "payment.authorized", "refund.created"])
async def test_non_capture_webhooks_never_activate(http, client_user, plans, event):
    order = await checkout(http, client_user, plans["growth"].id)
    assert (await send_webhook(http, webhook_body(event, order["order_id"]))).status_code == 200
    assert await active_subs(client_user.id) == []


async def test_an_upgrade_through_a_webhook_replaces_the_old_plan(http, client_user, plans):
    first = await checkout(http, client_user, plans["starter"].id)
    await pay(http, client_user, first)
    second = await checkout(http, client_user, plans["scale"].id)
    assert (await send_webhook(http, webhook_body("payment.captured", second["order_id"]))).status_code == 200
    (sub,) = await active_subs(client_user.id)
    assert sub.plan_id == plans["scale"].id


async def test_forged_webhooks_are_rejected(http, client_user, plans):
    order = await checkout(http, client_user, plans["growth"].id)
    body = webhook_body("payment.captured", order["order_id"])
    assert (await send_webhook(http, body, secret="wrong")).status_code == 400
    # ...including one signed with the placeholder secret that ships in the repository
    assert (await send_webhook(http, body, secret="webhook_secret_creo-26")).status_code == 400
    assert await active_subs(client_user.id) == []


async def test_production_refuses_webhooks_while_the_secret_is_still_the_placeholder(http, client_user, plans, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "webhook_secret_creo-26")
    order = await checkout(http, client_user, plans["growth"].id)
    res = await send_webhook(http, webhook_body("payment.captured", order["order_id"]), secret="webhook_secret_creo-26")
    assert res.status_code == 400 and await active_subs(client_user.id) == []


# ── the legacy negotiation payment route used to grant plans for free ────────


async def test_negotiation_confirm_payment_needs_a_real_signature(http, client_user, admin_user):
    neg = await bargain(http, client_user)
    await admin_decides(http, admin_user, neg, action="accept", agreed_price=30000)
    (custom,) = await client_plans(http, client_user)
    order = await checkout(http, client_user, custom["id"])

    forged = await http.post("/api/v1/negotiations/confirm-payment", headers=auth(client_user), json={
        "negotiation_id": neg, "razorpay_payment_id": "pay_fake", "razorpay_order_id": order["order_id"], "razorpay_signature": "x"})
    assert forged.status_code == 400
    none = await http.post("/api/v1/negotiations/confirm-payment", headers=auth(client_user), json={
        "negotiation_id": neg, "razorpay_payment_id": "pay_fake", "razorpay_order_id": "order_made_up"})
    assert none.status_code == 404
    assert await active_subs(client_user.id) == []

    ok = await http.post("/api/v1/negotiations/confirm-payment", headers=auth(client_user), json={
        "negotiation_id": neg, "razorpay_payment_id": f"pay_real_{RUN}", "razorpay_order_id": order["order_id"],
        "razorpay_signature": sign(order["order_id"], f"pay_real_{RUN}")})
    assert ok.status_code == 200 and ok.json()["status"] == "active"
    assert len(await active_subs(client_user.id)) == 1


# ── add-ons ──────────────────────────────────────────────────────────────────


async def buy_addon_order(http, client_user, addon_id):
    return await http.post("/api/v1/payments/addon-order", headers=auth(client_user), json={"addon_id": addon_id})


async def test_addons_require_an_active_plan(http, client_user):
    assert (await buy_addon_order(http, client_user, "addon_reels_3")).status_code == 402


async def test_addon_purchase_adds_quota_once(http, client_user, plans, gateway):
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    order = (await buy_addon_order(http, client_user, "addon_reels_3")).json()
    gateway.orders[order["order_id"]] = {"amount": order["amount_minor"], "currency": "INR"}
    body = {"addon_id": "addon_reels_3", "order_id": order["order_id"], "payment_id": f"pay_addon_1_{RUN}", "signature": sign(order["order_id"], f"pay_addon_1_{RUN}")}

    assert (await http.post("/api/v1/payments/addon-confirm", headers=auth(client_user), json=body)).status_code == 200
    assert (await quotas(client_user.id))["reel"] == (7, 0)

    replay = await http.post("/api/v1/payments/addon-confirm", headers=auth(client_user), json=body)
    assert replay.status_code == 409
    assert (await quotas(client_user.id))["reel"] == (7, 0)


async def test_addon_confirmation_cannot_skip_the_signature(http, client_user, plans):
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    for body in (
        {"addon_id": "addon_reels_6", "payment_id": f"pay_free_{RUN}"},
        {"addon_id": "addon_reels_6", "order_id": "order_x", "payment_id": f"pay_free_{RUN}"},
        {"addon_id": "addon_reels_6", "order_id": "order_x", "payment_id": f"pay_free_{RUN}", "signature": "bad"},
    ):
        res = await http.post("/api/v1/payments/addon-confirm", headers=auth(client_user), json=body)
        assert res.status_code == 400, body
    assert (await quotas(client_user.id))["reel"] == (4, 0)


async def test_a_cheap_addon_payment_cannot_unlock_an_expensive_addon(http, client_user, plans, gateway):
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    cheap = (await buy_addon_order(http, client_user, "revision")).json()  # ₹1,500
    gateway.orders[cheap["order_id"]] = {"amount": cheap["amount_minor"], "currency": "INR"}
    res = await http.post("/api/v1/payments/addon-confirm", headers=auth(client_user), json={
        "addon_id": "addon_shoot_full", "order_id": cheap["order_id"], "payment_id": f"pay_cheap_{RUN}",
        "signature": sign(cheap["order_id"], f"pay_cheap_{RUN}")})
    assert res.status_code == 400
    assert "shoot_day" not in await quotas(client_user.id)


async def test_an_unknown_addon_is_rejected(http, client_user, plans):
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    assert (await buy_addon_order(http, client_user, "free_everything")).status_code == 400


# ── subscription screen, pause and resume ────────────────────────────────────


async def test_subscription_summary_reflects_each_state(http, client_user, plans):
    before = (await http.get("/api/v1/payments/subscription", headers=auth(client_user))).json()
    assert before["is_active"] is False and before["subscription"] is None

    order = await checkout(http, client_user, plans["growth"].id)
    pending = (await http.get("/api/v1/payments/subscription", headers=auth(client_user))).json()
    assert pending["is_active"] is False and pending["pending_checkout"]["amount"] == 50000.0

    await pay(http, client_user, order)
    after = (await http.get("/api/v1/payments/subscription", headers=auth(client_user))).json()
    assert after["is_active"] is True and after["subscription"]["amount"] == 50000.0
    assert after["quotas"]["reel"] == {"quota": 8, "used": 0}
    history = (await http.get("/api/v1/payments/history", headers=auth(client_user))).json()
    assert len(history) == 1 and history[0]["status"] == "Paid"


async def test_pausing_needs_an_active_plan_then_works_and_resumes(http, client_user, plans):
    assert (await http.post("/api/v1/payments/subscription/pause", headers=auth(client_user), json={})).status_code == 400
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    paused = await http.post("/api/v1/payments/subscription/pause", headers=auth(client_user), json={"reason": "slow month"})
    assert paused.status_code == 200 and paused.json()["is_paused_next_month"] is True
    resumed = await http.post("/api/v1/payments/subscription/resume", headers=auth(client_user))
    assert resumed.status_code == 200 and resumed.json()["is_paused_next_month"] is False


async def test_an_expired_subscription_no_longer_counts_as_active(http, client_user, plans):
    await pay(http, client_user, await checkout(http, client_user, plans["starter"].id))
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE subscriptions SET current_period_end = :t WHERE client_id = :c"),
            {"t": datetime.now(UTC) - timedelta(days=1), "c": client_user.id},
        )
        await db.commit()
    summary = (await http.get("/api/v1/payments/subscription", headers=auth(client_user))).json()
    assert summary["is_active"] is False
    renewal = await checkout(http, client_user, plans["starter"].id)  # renewing the same plan is allowed
    assert (await pay(http, client_user, renewal)).json()["status"] == "active"
    assert len(await active_subs(client_user.id)) == 1
