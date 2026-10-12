"""Payments API router for plan retrieval, checkout order generation, and confirmation polling."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
import uuid
from decimal import Decimal
from app.models.billing import PaymentEvent, Plan, PlanNegotiation, Subscription, UsageCounter
from app.models.enums import SubscriptionStatus
from app.schemas.billing import (
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    PlanResponse,
)
from app.services import payment_service

from fastapi import APIRouter, Depends, HTTPException, Request

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    """Retrieve all available subscription plans.
    If the authenticated client has an approved or counter-offered custom negotiation,
    returns ONLY that client's custom negotiated plan (the 3 standard tiers are hidden).
    """
    client_id: uuid.UUID | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        try:
            from app.core.security import decode_token
            payload = decode_token(token, expected_type="access")
            client_id = uuid.UUID(payload["sub"])
        except Exception:
            pass

    query_cid = request.query_params.get("client_id")
    if not client_id and query_cid:
        try:
            client_id = uuid.UUID(query_cid)
        except Exception:
            pass

    if client_id:
        custom_plan_stmt = select(Plan).where(
            Plan.name == f"custom_{client_id.hex[:8]}",
            Plan.is_active.is_(True),
        )
        custom_plan = (await db.execute(custom_plan_stmt)).scalar_one_or_none()

        # If custom plan not yet generated, check if client has an Accepted or Counter Offered negotiation
        if not custom_plan:
            neg_stmt = (
                select(PlanNegotiation)
                .where(
                    PlanNegotiation.client_id == client_id,
                    PlanNegotiation.status.in_(["Accepted", "Counter Offered", "APPROVED"]),
                )
                .order_by(PlanNegotiation.created_at.desc())
                .limit(1)
            )
            neg = (await db.execute(neg_stmt)).scalar_one_or_none()
            if neg:
                final_amt = neg.counter_price or neg.agreed_amount
                if not final_amt and neg.proposed_offer:
                    digits = "".join(c for c in str(neg.proposed_offer) if c.isdigit())
                    if digits:
                        try:
                            final_amt = int(digits)
                        except Exception:
                            pass
                if not final_amt or final_amt <= 0:
                    final_amt = 35000

                reel_q = neg.reel_quota or 8
                poster_q = neg.poster_quota or 12
                story_q = neg.story_quota or 15
                display_name = (
                    f"Agency Counter Proposal ({neg.client_name})"
                    if neg.status == "Counter Offered"
                    else f"Custom Negotiated Retainer ({neg.client_name})"
                )
                highlights = [
                    f"{reel_q} Custom Reels",
                    f"{poster_q} Static Posters",
                    f"{story_q} Stories / Carousels",
                    "Negotiated Strategy Agreement",
                    "Dedicated Creative Pod Lead",
                ]

                custom_plan = Plan(
                    id=uuid.uuid4(),
                    agency_id=neg.agency_id,
                    name=f"custom_{client_id.hex[:8]}",
                    display_name=display_name,
                    monthly_price=Decimal(final_amt),
                    price_minor=int(final_amt * 100),
                    currency="INR",
                    reel_quota=reel_q,
                    poster_quota=poster_q,
                    story_quota=story_q,
                    revision_rounds=2,
                    has_dedicated_manager=True,
                    highlights=highlights,
                    is_active=True,
                )
                db.add(custom_plan)
                await db.commit()
                await db.refresh(custom_plan)

        # STRICT ISOLATION & REQUIREMENT:
        # If client has a customized negotiated package, ONLY return that custom plan.
        # The 3 standard tiers MUST NOT be shown to this client!
        if custom_plan:
            return [PlanResponse.model_validate(custom_plan)]

    # Standard public tiers ONLY for clients without custom negotiations
    stmt = (
        select(Plan)
        .where(
            Plan.is_active.is_(True),
            Plan.name.in_(["starter", "growth", "scale"]),
        )
        .order_by(Plan.price_minor.asc())
    )
    plans = (await db.execute(stmt)).scalars().all()
    return [PlanResponse.model_validate(p) for p in plans]


@router.post("/orders", response_model=CreateOrderResponse)
@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    body: CreateOrderRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> CreateOrderResponse:
    """Initialize payment checkout session and create incomplete subscription."""
    client_id = actor.client_id or actor.user_id
    return await payment_service.create_order(
        db=db,
        client_id=client_id,
        plan_id=body.plan_id,
        gateway=body.gateway,
    )


@router.post("/confirm", response_model=ConfirmPaymentResponse)
async def confirm_payment(
    body: ConfirmPaymentRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> ConfirmPaymentResponse:
    """Verify client signature and poll internal database for webhook-activated status."""
    return await payment_service.confirm_order(
        db=db,
        order_id=body.order_id,
        gateway=body.gateway,
        payment_id=body.payment_id,
        signature=body.signature,
        actor=actor,
    )


@router.post("/addon-order")
async def create_addon_order(
    body: dict,
    actor: Actor = Depends(get_current_actor),
) -> dict:
    """Create a Razorpay order for a one-time add-on pack purchase (server-authoritative pricing)."""
    from app.config import settings as _s

    ADDON_PRICING = {
        "addon_posters_5": 350000,
        "addon_posters_10": 600000,
        "addon_reels_3": 650000,
        "addon_reels_6": 1200000,
        "addon_stories_10": 250000,
        "addon_stories_20": 450000,
        "addon_shoot_half": 1500000,
        "addon_shoot_full": 2800000,
        "extra_reel": 450000,
        "rush": 600000,
        "revision": 150000,
        "shoot": 1800000,
    }
    addon_id = body.get("addon_id", "")
    if addon_id not in ADDON_PRICING:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unauthorized addon package ID: '{addon_id}'. Allowed add-ons: {list(ADDON_PRICING.keys())}",
        )
    # Server-enforced pricing: never allow client-supplied amount
    amount_minor = ADDON_PRICING[addon_id]
    currency = "INR"

    key_id = _s.RAZORPAY_KEY_ID or "rzp_test_TO2r0YMjDZSpuC"
    key_secret = _s.RAZORPAY_KEY_SECRET or ""

    from app.services.razorpay_orders import create_razorpay_order
    order_id = await create_razorpay_order(key_id, key_secret, amount_minor, currency)

    return {
        "order_id": order_id,
        "addon_id": addon_id,
        "amount_minor": amount_minor,
        "currency": currency,
        "key_id": key_id,
    }



@router.get("/subscription", response_model=dict[str, Any])
async def get_client_subscription(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve active subscription, plan, and quota counters for client."""
    from app.services.subscription_guard import check_client_subscription

    client_id = actor.client_id or actor.user_id

    # Server-authoritative check with self-healing
    check = await check_client_subscription(db, client_id)
    sub = check["subscription"]
    plan = check["plan"]

    # If no active/expired subscription was found, check for an incomplete/pending checkout order
    if not sub:
        inc_stmt = (
            select(Subscription, Plan)
            .join(Plan, Subscription.plan_id == Plan.id)
            .where(
                Subscription.client_id == client_id,
                Subscription.status == SubscriptionStatus.INCOMPLETE,
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        inc_row = (await db.execute(inc_stmt)).first()
        if inc_row:
            sub, plan = inc_row

    counters_stmt = select(UsageCounter).where(UsageCounter.client_id == client_id)
    counters = (await db.execute(counters_stmt)).scalars().all()
    quota_map = {
        (c.kind.value if hasattr(c.kind, "value") else str(c.kind)): {
            "quota": c.quota,
            "used": c.used,
        }
        for c in counters
    }

    inv_stmt = (
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.client_id == client_id)
        .order_by(Subscription.created_at.desc())
    )
    inv_rows = (await db.execute(inv_stmt)).all()
    invoices = []
    for s, p in inv_rows:
        s_status = s.status.value if hasattr(s.status, "value") else str(s.status)
        inv_amt = float(s.amount) if s.amount is not None else float(p.monthly_price if p else 25000.0)
        invoices.append({
            "id": f"INV-{s.created_at.year}-{str(s.id)[:8].upper()}",
            "date": s.created_at.strftime("%B %d, %Y"),
            "amount": f"₹{inv_amt:,.2f}",
            "status": "Paid" if s_status in ["active", "trialing"] else s_status.capitalize(),
            "plan": p.display_name if p else "Growth Tier",
        })

    sub_data = None
    if sub:
        sub_status = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
        sub_gateway = sub.gateway.value if hasattr(sub.gateway, "value") else str(sub.gateway)
        effective_status = check["status"] if check["has_subscription"] else sub_status
        sub_amt = float(sub.amount) if sub.amount is not None else float(plan.monthly_price if plan else 25000.0)
        sub_data = {
            "id": str(sub.id),
            "status": effective_status,
            "gateway": sub_gateway,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "amount": sub_amt,
            "is_active": check["is_active"],
            "is_expired": check["is_expired"],
            "seconds_remaining": check["seconds_remaining"],
            "days_remaining": check["days_remaining"],
            "server_time_utc": check["server_time_utc"],
        }

    from app.models.user import ClientProfile
    prof_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    prof = (await db.execute(prof_stmt)).scalar_one_or_none()
    pause_info = (prof.brand_dna or {}).get("subscription_pause") if prof else None
    is_paused_next = bool(pause_info and pause_info.get("is_paused"))

    return {
        "subscription": sub_data,
        "plan": {
            "name": plan.name,
            "display_name": plan.display_name,
            "price_minor": plan.price_minor,
            "poster_quota": plan.poster_quota,
            "reel_quota": plan.reel_quota,
            "story_quota": plan.story_quota,
        } if plan else None,
        "quotas": quota_map if (sub_data and check["is_active"]) else {},
        "invoices": invoices,
        "is_active": check["is_active"],
        "is_expired": check["is_expired"],
        "seconds_remaining": check["seconds_remaining"],
        "days_remaining": check["days_remaining"],
        "server_time_utc": check["server_time_utc"],
        "is_paused_next_month": is_paused_next,
        "pause_details": pause_info if is_paused_next else None,
    }



@router.get("/history")
async def get_payment_history(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retrieve full subscription and payment history for the active client."""
    from app.models.billing import Subscription, Plan

    client_id = actor.client_id or actor.user_id
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.client_id == client_id)
        .order_by(Subscription.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": str(sub.id),
            "plan_id": str(sub.plan_id),
            "plan_name": plan.display_name,
            "amount": float(sub.amount) if sub.amount else float(plan.monthly_price),
            "status": sub.status.value,
            "gateway": sub.gateway.value,
            "gateway_subscription_id": sub.gateway_subscription_id,
            "gateway_customer_id": sub.gateway_customer_id,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        }
        for sub, plan in rows
    ]



class PauseSubscriptionRequest(BaseModel):
    reason: str | None = None
    notes: str | None = None


@router.post("/subscription/pause")
async def pause_subscription(
    body: PauseSubscriptionRequest | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Schedules the active subscription to pause for the upcoming cycle."""
    from datetime import UTC, datetime
    from sqlalchemy.orm.attributes import flag_modified
    from app.models.user import ClientProfile, User
    from app.models.support import Ticket
    from app.models.enums import TicketPriority, TicketStatus
    from app.services.subscription_guard import check_client_subscription
    from app.core.logging import get_logger

    logger = get_logger("app.routers.payments")
    req = body or PauseSubscriptionRequest()

    client_id = actor.client_id or actor.user_id
    check = await check_client_subscription(db, client_id)
    sub = check.get("subscription")
    plan = check.get("plan")

    prof_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    prof = (await db.execute(prof_stmt)).scalar_one_or_none()
    if not prof:
        prof = ClientProfile(user_id=client_id, brand_dna={})
        db.add(prof)

    dna = dict(prof.brand_dna or {})
    effective_date_str = (
        sub.current_period_end.strftime("%d %b %Y")
        if sub and getattr(sub, "current_period_end", None)
        else "next cycle"
    )
    effective_date_iso = (
        sub.current_period_end.isoformat()
        if sub and getattr(sub, "current_period_end", None)
        else None
    )

    dna["subscription_pause"] = {
        "is_paused": True,
        "reason": req.reason or "Client requested pause",
        "notes": req.notes,
        "paused_at": datetime.now(UTC).isoformat(),
        "effective_date": effective_date_iso,
    }
    prof.brand_dna = dna
    flag_modified(prof, "brand_dna")

    # Notify account/ops team via internal support ticket (non-blocking)
    try:
        user_stmt = select(User).where(User.id == client_id)
        user_obj = (await db.execute(user_stmt)).scalar_one_or_none()
        client_name = (user_obj.full_name if user_obj else None) or actor.email or str(client_id)

        pause_ticket = Ticket(
            client_id=client_id,
            agency_id=getattr(sub, "agency_id", None) if sub else (user_obj.agency_id if user_obj else None),
            title=f"Subscription Pause Request: Next Month ({plan.display_name if plan else 'Active Retainer'})",
            description=(
                f"Client {client_name} ({actor.email}) requested to pause their retainer for the upcoming cycle.\n\n"
                f"• Effective renewal date: {effective_date_str}\n"
                f"• Reason: {req.reason or 'Not specified'}\n"
                f"• Notes: {req.notes or 'None'}\n"
                f"Current period remains active until {effective_date_str}."
            ),
            priority=TicketPriority.HIGH,
            status=TicketStatus.OPEN,
        )
        db.add(pause_ticket)
    except Exception as err:
        logger.warning("subscription_pause_ticket_skipped", error=str(err))

    await db.commit()

    return {
        "success": True,
        "message": f"Your plan has been scheduled to pause starting {effective_date_str}. You will not be charged next month.",
        "is_paused_next_month": True,
        "effective_date": effective_date_iso,
    }


@router.post("/subscription/resume")
async def resume_subscription(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Resumes automatic renewal for the client's next cycle."""
    from datetime import UTC, datetime
    from sqlalchemy.orm.attributes import flag_modified
    from app.models.user import ClientProfile, User
    from app.models.support import Ticket
    from app.models.enums import TicketPriority, TicketStatus
    from app.services.subscription_guard import check_client_subscription
    from app.core.logging import get_logger

    logger = get_logger("app.routers.payments")

    client_id = actor.client_id or actor.user_id
    check = await check_client_subscription(db, client_id)
    sub = check.get("subscription")
    plan = check.get("plan")

    prof_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    prof = (await db.execute(prof_stmt)).scalar_one_or_none()
    if not prof:
        prof = ClientProfile(user_id=client_id, brand_dna={})
        db.add(prof)

    dna = dict(prof.brand_dna or {})
    dna["subscription_pause"] = {
        "is_paused": False,
        "resumed_at": datetime.now(UTC).isoformat(),
    }
    prof.brand_dna = dna
    flag_modified(prof, "brand_dna")

    try:
        user_stmt = select(User).where(User.id == client_id)
        user_obj = (await db.execute(user_stmt)).scalar_one_or_none()
        client_name = (user_obj.full_name if user_obj else None) or actor.email or str(client_id)

        resume_ticket = Ticket(
            client_id=client_id,
            agency_id=getattr(sub, "agency_id", None) if sub else (user_obj.agency_id if user_obj else None),
            title=f"Subscription Resumed by Client ({plan.display_name if plan else 'Active Retainer'})",
            description=f"Client {client_name} ({actor.email}) resumed their subscription renewal. AutoPay will proceed normally.",
            priority=TicketPriority.MEDIUM,
            status=TicketStatus.RESOLVED,
        )
        db.add(resume_ticket)
    except Exception as err:
        logger.warning("subscription_resume_ticket_skipped", error=str(err))

    await db.commit()

    return {
        "success": True,
        "message": "Your subscription renewal has been resumed. AutoPay remains active.",
        "is_paused_next_month": False,
    }
