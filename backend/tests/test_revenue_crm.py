"""Offline business-rule and tenant scope regression tests."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from sqlalchemy.dialects import postgresql

from app.core.errors import Conflict, Forbidden
from app.models.crm import Lead
from app.models.enums import UserRole
from app.services.crm_access import require_admin, require_manager, scope
from app.services.revenue_crm import (
    DEFAULT_POLICY,
    future,
    normalized_contact,
    period_bounds,
    price_items,
    score,
)


def line(**overrides):
    return {
        "title": "Reels",
        "quantity": "1",
        "unit_price": 10000,
        "discount_bps": 0,
        "billing": "one_time",
        **overrides,
    }


def test_pricing_uses_minor_units_and_keeps_recurring_separate():
    result, approval = price_items(
        [line(quantity="1.5", discount_bps=1000), line(unit_price=2000, billing="monthly")],
        1800,
        15,
    )
    assert result["totals"]["one_time"] == {
        "subtotal": 15000,
        "discount": 1500,
        "tax": 2430,
        "total": 15930,
    }
    assert result["totals"]["monthly"]["total"] == 2360
    assert not approval


def test_discount_floor_and_threshold_require_exact_version_approval():
    assert price_items([line(discount_bps=1600)], 0, 15)[1]
    assert price_items([line(unit_price=99, minimum_price=100)], 0, 15)[1]
    assert (
        price_items([line(quantity="1.01", unit_price=101, discount_bps=101)], 0, 15)[0]["items"][
            0
        ]["total"]
        == 101
    )


@pytest.mark.parametrize(
    "changes",
    [{"quantity": "0"}, {"unit_price": -1}, {"discount_bps": 10001}, {"billing": "weekly"}],
)
def test_invalid_pricing_cannot_be_saved(changes):
    with pytest.raises(Conflict):
        price_items([line(**changes)], 0, 15)


def test_unknown_evidence_never_becomes_invented_temperature():
    result = score({"intent": 100}, DEFAULT_POLICY)
    assert (
        result["temperature"] == "unknown"
        and result["completeness"] == 20
        and result["score"] == 25
    )
    result = score(
        {k: 100 for k in ["service_fit", "intent", "urgency", "engagement", "decision_maker"]},
        DEFAULT_POLICY,
    )
    assert result["temperature"] == "hot" and result["score"] == 100


def test_reporting_month_uses_local_timezone_boundary():
    start, end = period_bounds("2026-11", "Asia/Kolkata")
    assert start == datetime(2026, 10, 31, 18, 30, tzinfo=UTC)
    assert end == datetime(2026, 11, 30, 18, 30, tzinfo=UTC)


def test_contact_normalization_and_bad_number():
    assert normalized_contact("+91 (98765) 43210", " CLIENT@Example.com ") == (
        "+919876543210",
        "client@example.com",
    )
    with pytest.raises(Conflict):
        normalized_contact("9876543210", None)
    with pytest.raises(Conflict):
        future(datetime(2020, 1, 1, tzinfo=UTC))


def test_bde_ownership_and_head_reporting_scope_are_both_tenant_bound():
    agency, user = uuid.uuid4(), uuid.uuid4()
    actor = SimpleNamespace(role=UserRole.BDE, agency_id=agency, user_id=user)
    expression = scope(actor, Lead.agency_id, Lead.assigned_bde_id)
    params = expression.compile().params
    assert agency in params.values() and user in params.values()
    actor.role = UserRole.BDE_HEAD
    sql = str(
        scope(actor, Lead.agency_id, Lead.assigned_bde_id).compile(dialect=postgresql.dialect())
    )
    assert (
        "staff_profiles.team_lead_id" in sql
        and "teams.lead_id" in sql
        and "bde_leads.agency_id" in sql
    )


def test_non_crm_roles_and_unscoped_admin_are_denied():
    for role, agency in [
        (UserRole.CLIENT, uuid.uuid4()),
        (UserRole.EDITOR, uuid.uuid4()),
        (UserRole.TEAM_LEAD, uuid.uuid4()),
        (UserRole.ADMIN, None),
    ]:
        with pytest.raises(Forbidden):
            scope(SimpleNamespace(role=role, agency_id=agency), Lead.agency_id)
    with pytest.raises(Forbidden):
        require_manager(SimpleNamespace(role=UserRole.BDE))
    with pytest.raises(Forbidden):
        require_admin(SimpleNamespace(role=UserRole.BDE_HEAD))


@pytest.mark.asyncio
async def test_whatsapp_template_outage_returns_actionable_error_without_sending(monkeypatch):
    import httpx
    from app.services import crm_whatsapp

    monkeypatch.setattr(
        crm_whatsapp, "connection", lambda agency: {"business_account_id": "test", "token": "test"}
    )

    async def unavailable(self, *args, **kwargs):
        raise httpx.ConnectTimeout("Provider unavailable")

    monkeypatch.setattr(httpx.AsyncClient, "get", unavailable)
    with pytest.raises(Conflict, match="temporarily unavailable"):
        await crm_whatsapp.templates(uuid.uuid4())
