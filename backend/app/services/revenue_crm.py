"""Deterministic CRM rules: exact money, dated work, evidence and audit."""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import or_, select

from app.core.errors import Conflict, NotFound
from app.models.crm import Lead, LeadActivity
from app.models.ops import AuditLog
from app.models.revenue_crm import CRMPolicy
from app.services.crm_access import scope

DEFAULT_POLICY = {
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "discount_approval_percent": 15,
    "hot_threshold": 75,
    "warm_threshold": 40,
    "monthly_won_target": 0,
    "quiet_start": 20,
    "quiet_end": 9,
    "max_messages_per_day": 2,
    "follow_up_days": {"hot": 1, "warm": 4, "cold": 21},
}
CLOSED = {"converted", "lost", "disqualified", "archived"}
STAGES = {
    "new",
    "contacted",
    "qualified",
    "meeting_scheduled",
    "proposal_sent",
    "negotiation",
    "converted",
    "lost",
    "nurture",
    "disqualified",
}


def utc(value: datetime) -> datetime:
    if not value.tzinfo or value.utcoffset() is None:
        raise Conflict("Include a timezone offset in dates.", code="TIMEZONE_REQUIRED")
    return value.astimezone(UTC)


def future(value: datetime) -> datetime:
    value = utc(value)
    if value <= datetime.now(UTC):
        raise Conflict("Choose a future due date.", code="PAST_DUE_DATE")
    return value


def normalized_contact(phone: str | None, email: str | None):
    phone = re.sub(r"[\s().-]", "", phone or "")
    if phone and not re.fullmatch(r"\+[1-9]\d{7,14}", phone):
        raise Conflict(
            "Use an international phone number, for example +919876543210.", code="INVALID_PHONE"
        )
    return phone or None, (email or "").strip().lower() or None


async def policy(db, agency_id):
    row = await db.get(CRMPolicy, agency_id)
    return {**DEFAULT_POLICY, **(row.settings if row else {})}, (row.branding if row else {})


def validate_policy(values):
    try:
        ZoneInfo(values["timezone"])
    except (ZoneInfoNotFoundError, ValueError):
        raise Conflict("Choose a valid IANA reporting timezone.") from None
    if not re.fullmatch(r"[A-Z]{3}", values["currency"]):
        raise Conflict("Use a three-letter currency code.")
    if values.get("quiet_end", 9) >= values.get("quiet_start", 20):
        raise Conflict("Messaging hours must begin before the quiet-hours start.")
    if not 0 <= values["warm_threshold"] < values["hot_threshold"] <= 100:
        raise Conflict("Score thresholds must satisfy 0 <= warm < hot <= 100.")


def period_bounds(month: str, timezone: str):
    try:
        year, number = map(int, month.split("-"))
        zone = ZoneInfo(timezone)
        start = datetime(year, number, 1, tzinfo=zone)
        end = datetime(year + (number == 12), 1 if number == 12 else number + 1, 1, tzinfo=zone)
        return start.astimezone(UTC), end.astimezone(UTC)
    except (ValueError, ZoneInfoNotFoundError):
        raise Conflict("Choose a month in YYYY-MM format and a valid timezone.") from None


def score(evidence: dict, settings: dict):
    weights = {
        "service_fit": 25,
        "intent": 25,
        "urgency": 20,
        "engagement": 20,
        "decision_maker": 10,
    }
    present = {k: v for k, v in evidence.items() if k in weights and v is not None}
    if any(
        not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= 100 for v in present.values()
    ):
        raise Conflict("Each qualification factor must be an integer from 0 to 100.")
    total = sum(Decimal(v) * weights[k] / 100 for k, v in present.items())
    result = int(total.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    complete = len(present) == len(weights)
    temperature = (
        (
            "hot"
            if result >= settings["hot_threshold"]
            else "warm"
            if result >= settings["warm_threshold"]
            else "cold"
        )
        if complete
        else "unknown"
    )
    return {
        "score": result,
        "temperature": temperature,
        "completeness": len(present) * 20,
        "evidence": present,
        "weights": weights,
        "updated_at": datetime.now(UTC).isoformat(),
    }


def price_items(items: list[dict], tax_bps: int, threshold: int):
    if not items or len(items) > 100:
        raise Conflict("A proposal needs between 1 and 100 service lines.")
    totals = {}
    approval = False
    output = []
    for item in items:
        quantity = Decimal(str(item["quantity"]))
        unit, discount = int(item["unit_price"]), int(item["discount_bps"])
        if (
            quantity <= 0
            or quantity > 100000
            or unit < 0
            or unit > 10**12
            or not 0 <= discount <= 10000
        ):
            raise Conflict("Invalid quantity, unit price or discount.")
        billing = item["billing"]
        if billing not in {"one_time", "monthly", "quarterly", "annual"}:
            raise Conflict("Choose a supported billing period.")
        base = int((quantity * unit).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        reduction = int(
            (Decimal(base) * discount / 10000).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )
        net = base - reduction
        tax = int((Decimal(net) * tax_bps / 10000).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        approval |= discount > threshold * 100 or Decimal(unit) * (
            10000 - discount
        ) / 10000 < item.get("minimum_price", 0)
        row = {
            **item,
            "quantity": str(quantity),
            "subtotal": base,
            "discount": reduction,
            "tax": tax,
            "total": net + tax,
        }
        output.append(row)
        current = totals.setdefault(billing, {"subtotal": 0, "discount": 0, "tax": 0, "total": 0})
        for key in current:
            current[key] += row[key]
        if any(value > 10**14 for value in current.values()):
            raise Conflict(
                "This proposal exceeds the supported commercial amount. Split it into separate proposals."
            )
    return {"items": output, "totals": totals, "tax_bps": tax_bps}, bool(approval)


async def lead_for(db, actor, lead_id, lock=False):
    stmt = select(Lead).where(
        Lead.id == lead_id, scope(actor, Lead.agency_id, Lead.assigned_bde_id)
    )
    if lock:
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise NotFound("Lead not found or outside your assigned CRM scope.")
    return lead


async def audit(db, actor, action, entity_id, details=None):
    db.add(
        AuditLog(
            agency_id=actor.agency_id,
            actor_id=actor.user_id,
            actor_role=actor.role,
            entity="revenue_crm",
            entity_id=entity_id,
            action=action,
            to_value=details or {},
        )
    )


async def event(db, actor, lead, action, details=None):
    db.add(
        LeadActivity(
            lead_id=lead.id,
            bde_id=actor.user_id,
            activity_type="note",
            summary=action.replace("_", " ").capitalize(),
            metadata_extra=details or {},
        )
    )
    await audit(db, actor, action, lead.id, details)


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def serialize(row):
    from sqlalchemy import inspect

    result = {}
    for col in inspect(type(row)).columns:
        if col.key in {"share_hash", "pdf_content"}:
            continue
        value = getattr(row, col.key)
        result[col.key] = (
            str(value)
            if isinstance(value, uuid.UUID)
            else value.isoformat()
            if isinstance(value, datetime)
            else value
        )
    return result


async def duplicates(db, agency_id, phone, email):
    conditions = []
    if phone:
        # Normalize legacy display formatting as well as newly normalized records.
        from sqlalchemy import func

        conditions.append(func.regexp_replace(Lead.phone, r"[\s().-]", "", "g") == phone)
    if email:
        from sqlalchemy import func

        conditions.append(func.lower(Lead.email) == email)
    if not conditions:
        return []
    return list(
        (await db.execute(select(Lead.id).where(Lead.agency_id == agency_id, or_(*conditions))))
        .scalars()
        .all()
    )
