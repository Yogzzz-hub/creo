"""Payments API router for plan retrieval, checkout order generation, and confirmation polling."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from datetime import UTC, date, datetime, timedelta
import uuid
from decimal import Decimal
from app.models.user import User
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
    caller_role = ""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        try:
            from app.core.security import decode_token
            payload = decode_token(token, expected_type="access")
            client_id = uuid.UUID(payload["sub"])
            caller_role = str(payload.get("role") or "").lower()
        except Exception:
            pass

    # Only an admin may look at another client's negotiated plan (the offline-payment
    # dialog does). For everyone else the id is ignored: honouring it would expose any
    # client's private price and let strangers trigger the cleanup writes below.
    query_cid = request.query_params.get("client_id")
    if query_cid and caller_role in ("admin", "super_admin"):
        try:
            client_id = uuid.UUID(query_cid)
        except Exception:
            pass

    if client_id:
        user_stmt = select(User).where(User.id == client_id)
        current_user = (await db.execute(user_stmt)).scalar_one_or_none()
        user_created_at = current_user.created_at if current_user else None
        clean_email = current_user.email.strip().lower() if current_user and current_user.email else ""

        # Query all negotiations linked to this client_id or matching their email
        neg_filters = [PlanNegotiation.client_id == client_id]
        if clean_email:
            neg_filters.append(func.lower(PlanNegotiation.client_email) == clean_email)

        all_negs = (await db.execute(
            select(PlanNegotiation).where(or_(*neg_filters)).order_by(PlanNegotiation.created_at.desc())
        )).scalars().all()

        active_valid_neg = None
        for n in all_negs:
            # If negotiation was created before this user account was created, it's stale from a deleted account
            if user_created_at and n.created_at and n.created_at < user_created_at - timedelta(minutes=5):
                n.status = "ARCHIVED"
                n.client_id = None
            elif n.status in ["Accepted", "Counter Offered", "APPROVED"]:
                if active_valid_neg is None:
                    active_valid_neg = n

        # `plans.name` is unique and custom plans are only ever deactivated (never
        # deleted), so look the row up regardless of is_active and reactivate it below.
        custom_plan_stmt = select(Plan).where(Plan.name == f"custom_{client_id.hex[:8]}")
        custom_plan = (await db.execute(custom_plan_stmt)).scalar_one_or_none()

        # If there is NO active valid negotiation for this user account:
        if not active_valid_neg:
            # Deactivate any custom plan for this client
            if custom_plan:
                custom_plan.is_active = False
                custom_plan = None
            if clean_email:
                await db.execute(
                    update(Plan)
                    .where(
                        Plan.name.like("custom_%"),
                        Plan.display_name.ilike(f"%{clean_email}%"),
                    )
                    .values(is_active=False)
                )
            await db.commit()
        else:
            # We have a valid active negotiation for this account!
            final_amt = active_valid_neg.counter_price or active_valid_neg.agreed_amount
            if not final_amt and active_valid_neg.proposed_offer:
                digits = "".join(c for c in str(active_valid_neg.proposed_offer) if c.isdigit())
                if digits:
                    try:
                        final_amt = int(digits)
                    except Exception:
                        pass
            if not final_amt or final_amt <= 0:
                final_amt = 35000

            reel_q = active_valid_neg.reel_quota or 8
            poster_q = active_valid_neg.poster_quota or 12
            story_q = active_valid_neg.story_quota or 15
            display_name = (
                f"Agency Counter Proposal ({active_valid_neg.client_name})"
                if active_valid_neg.status == "Counter Offered"
                else f"Custom Negotiated Retainer ({active_valid_neg.client_name})"
            )
            highlights = [
                f"{reel_q} Custom Reels",
                f"{poster_q} Static Posters",
                f"{story_q} Stories / Carousels",
                "Negotiated Strategy Agreement",
                "Dedicated Creative Pod Lead",
            ]

            if custom_plan:
                # Reuse (and revive) the existing row so a returning client never hits
                # the unique constraint on plans.name, and refresh it from the
                # current negotiation so a stale price/quota is never shown.
                custom_plan.display_name = display_name[:100]
                custom_plan.monthly_price = Decimal(final_amt)
                custom_plan.price_minor = int(final_amt * 100)
                custom_plan.reel_quota = reel_q
                custom_plan.poster_quota = poster_q
                custom_plan.story_quota = story_q
                custom_plan.highlights = highlights
                custom_plan.is_active = True
            else:
                custom_plan = Plan(
                    id=uuid.uuid4(),
                    agency_id=active_valid_neg.agency_id,
                    name=f"custom_{client_id.hex[:8]}",
                    display_name=display_name[:100],
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
    db: AsyncSession = Depends(get_db),
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

    # Add-ons are available only to clients with a currently active, unexpired plan.
    # Enforce this before asking Razorpay to create an order, even if the UI is bypassed.
    from app.services.subscription_guard import check_client_subscription

    client_id = actor.client_id or actor.user_id
    subscription_check = await check_client_subscription(db, client_id)
    if not subscription_check["is_active"]:
        is_expired = subscription_check["is_expired"]
        raise HTTPException(
            status_code=402,
            detail={
                "code": "SUBSCRIPTION_EXPIRED" if is_expired else "PAYMENT_REQUIRED",
                "message": (
                    "Your plan has expired. Renew an active plan before adding extras."
                    if is_expired
                    else "An active subscription is required before you can add extras."
                ),
                "status": subscription_check["status"],
            },
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


class ConfirmAddonRequest(BaseModel):
    addon_id: str
    order_id: str | None = None
    payment_id: str
    signature: str | None = None


@router.post("/addon-confirm")
async def confirm_addon_order(
    body: ConfirmAddonRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify and record a one-time add-on pack purchase, adding to quotas and generating a paid invoice."""
    from sqlalchemy.orm.attributes import flag_modified
    from app.config import settings as _s
    from app.models.billing import PaymentEvent, UsageCounter
    from app.models.enums import DeliverableType, PaymentProvider
    from app.models.user import ClientProfile

    ADDON_CONFIG = {
        "extra_reel": {"name": "Extra reel", "amount": 4500.0, "type": DeliverableType.REEL, "quota_delta": 1},
        "rush": {"name": "Rush delivery (24h turnaround)", "amount": 6000.0, "type": None, "quota_delta": 0},
        "revision": {"name": "Extra revision round", "amount": 1500.0, "type": None, "quota_delta": 0},
        "shoot": {"name": "Half-day shoot (Chennai)", "amount": 18000.0, "type": DeliverableType.SHOOT_DAY, "quota_delta": 1},
        "addon_posters_5": {"name": "5 Extra Static Posts", "amount": 3500.0, "type": DeliverableType.STATIC_POST, "quota_delta": 5},
        "addon_posters_10": {"name": "10 Extra Static Posts", "amount": 6000.0, "type": DeliverableType.STATIC_POST, "quota_delta": 10},
        "addon_reels_3": {"name": "3 Extra Reels", "amount": 6500.0, "type": DeliverableType.REEL, "quota_delta": 3},
        "addon_reels_6": {"name": "6 Extra Reels", "amount": 12000.0, "type": DeliverableType.REEL, "quota_delta": 6},
        "addon_stories_10": {"name": "10 Extra Stories", "amount": 2500.0, "type": DeliverableType.CAROUSEL, "quota_delta": 10},
        "addon_stories_20": {"name": "20 Extra Stories", "amount": 4500.0, "type": DeliverableType.CAROUSEL, "quota_delta": 20},
        "addon_shoot_half": {"name": "Half-day Shoot", "amount": 15000.0, "type": DeliverableType.SHOOT_DAY, "quota_delta": 1},
        "addon_shoot_full": {"name": "Full-day Shoot", "amount": 28000.0, "type": DeliverableType.SHOOT_DAY, "quota_delta": 2},
    }

    if body.addon_id not in ADDON_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid addon_id: '{body.addon_id}'")

    client_id = actor.client_id or actor.user_id
    now = datetime.now(UTC)
    cfg = ADDON_CONFIG[body.addon_id]
    amount = cfg["amount"]

    # The payment must be proven, not asserted. A valid checkout signature shows the browser
    # really completed a Razorpay payment for this order; only local development without
    # gateway keys may skip it.
    if not payment_service.sandbox_confirmation_allowed():
        if not payment_service.verify_checkout_signature(body.order_id, body.payment_id, body.signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        # A signature for a cheap add-on's order must not unlock an expensive one.
        from app.services.razorpay_orders import fetch_razorpay_order

        order = await fetch_razorpay_order(
            getattr(_s, "RAZORPAY_KEY_ID", ""), getattr(_s, "RAZORPAY_KEY_SECRET", ""), str(body.order_id),
        )
        if order is None:
            raise HTTPException(
                status_code=503,
                detail="We could not verify your payment with the gateway yet. Please retry in a moment.",
            )
        if order.get("amount") != int(round(amount * 100)) or order.get("currency") != "INR":
            raise HTTPException(status_code=400, detail="Payment amount does not match this add-on.")

    # One payment buys one add-on, once.
    payment_ref = body.payment_id or f"addon_{uuid.uuid4().hex[:8]}"
    already_applied = (
        await db.execute(
            select(PaymentEvent.id).where(
                PaymentEvent.provider == PaymentProvider.RAZORPAY,
                PaymentEvent.provider_event_id == payment_ref,
            )
        )
    ).first()
    if already_applied:
        raise HTTPException(status_code=409, detail="This payment has already been applied.")

    # Increment quota if deliverable type is defined
    if cfg["type"] and cfg["quota_delta"] > 0:
        counter_stmt = (
            select(UsageCounter)
            .where(
                UsageCounter.client_id == client_id,
                UsageCounter.kind == cfg["type"],
            )
            .order_by(UsageCounter.period_end.desc())
            .limit(1)
        )
        counter = (await db.execute(counter_stmt)).scalar_one_or_none()
        if counter:
            counter.quota += cfg["quota_delta"]
            db.add(counter)
        else:
            # Paid for, so never silently dropped: open this month's counter with the add-on.
            month_start = now.date().replace(day=1)
            next_month = date(month_start.year + (month_start.month == 12), month_start.month % 12 + 1, 1)
            db.add(UsageCounter(
                client_id=client_id, period_start=month_start, period_end=next_month - timedelta(days=1),
                kind=cfg["type"], quota=cfg["quota_delta"], used=0,
            ))

    # Record in ClientProfile
    prof_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    prof = (await db.execute(prof_stmt)).scalar_one_or_none()
    if not prof:
        prof = ClientProfile(user_id=client_id, brand_dna={})
        db.add(prof)

    dna = dict(prof.brand_dna or {})
    addon_purchases = list(dna.get("addon_purchases", []))
    addon_inv_id = f"INV-{now.year}-ADDON-{uuid.uuid4().hex[:6].upper()}"
    new_invoice = {
        "id": addon_inv_id,
        "date": now.strftime("%B %d, %Y"),
        "amount": f"₹{amount:,.2f}",
        "status": "Paid",
        "plan": f"{cfg['name']} (Add-on)",
        "addon_id": body.addon_id,
        "order_id": body.order_id,
        "payment_id": body.payment_id,
        "created_at": now.isoformat(),
    }
    addon_purchases.insert(0, new_invoice)
    dna["addon_purchases"] = addon_purchases
    prof.brand_dna = dna
    flag_modified(prof, "brand_dna")

    # Audit / payment event
    event = PaymentEvent(
        provider=PaymentProvider.RAZORPAY,
        provider_event_id=payment_ref,
        event_type="addon.payment.captured",
        payload={
            "client_id": str(client_id),
            "addon_id": body.addon_id,
            "order_id": body.order_id,
            "amount": amount,
            "invoice_id": addon_inv_id,
        },
        signature_valid=True,
        processed_at=now,
    )
    db.add(event)

    await db.commit()

    return {
        "success": True,
        "message": f"Successfully added {cfg['name']} to this cycle!",
        "invoice": new_invoice,
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

    # Check if there is an incomplete checkout order, but keep it distinct as pending_checkout
    pending_checkout = None
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
            inc_sub, inc_plan = inc_row
            pending_checkout = {
                "id": str(inc_sub.id),
                "plan_name": inc_plan.display_name,
                "amount": float(inc_sub.amount if inc_sub.amount is not None else inc_plan.monthly_price),
            }

    counters_stmt = select(UsageCounter).where(UsageCounter.client_id == client_id)
    counters = (await db.execute(counters_stmt)).scalars().all()
    quota_map = {
        (c.kind.value if hasattr(c.kind, "value") else str(c.kind)): {
            "quota": c.quota,
            "used": c.used,
        }
        for c in counters
    }

    # Only show actual paid/active/canceled subscriptions in invoices, NOT incomplete abandoned checkout orders!
    inv_stmt = (
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(
            Subscription.client_id == client_id,
            Subscription.status != SubscriptionStatus.INCOMPLETE,
        )
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
            "status": "Paid" if s_status in ["active", "trialing", "canceled"] else s_status.capitalize(),
            "plan": p.display_name if p else "Growth Tier",
            "created_at": s.created_at.isoformat() if s.created_at else None,
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

    # Include paid add-on purchases in the invoices table
    addon_purchases = (prof.brand_dna or {}).get("addon_purchases", []) if prof else []
    for addon_inv in addon_purchases:
        invoices.append({
            "id": addon_inv.get("id"),
            "date": addon_inv.get("date"),
            "amount": addon_inv.get("amount"),
            "status": "Paid",
            "plan": addon_inv.get("plan", "Add-on Purchase"),
            "created_at": addon_inv.get("created_at"),
        })

    # Sort all invoices by created_at descending
    invoices.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)

    return {
        "subscription": sub_data,
        "plan": {
            "name": plan.name,
            "display_name": plan.display_name,
            "price_minor": plan.price_minor,
            "poster_quota": plan.poster_quota,
            "reel_quota": plan.reel_quota,
            "story_quota": plan.story_quota,
        } if (plan and (check["is_active"] or check["is_expired"])) else None,
        "pending_checkout": pending_checkout,
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
        .where(
            Subscription.client_id == client_id,
            Subscription.status != SubscriptionStatus.INCOMPLETE,
        )
        .order_by(Subscription.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": str(sub.id),
            "plan_id": str(sub.plan_id),
            "plan_name": plan.display_name,
            "amount": float(sub.amount) if sub.amount else float(plan.monthly_price),
            "status": "Paid" if sub.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.CANCELED] else sub.status.value,
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
    if not check.get("is_active"):
        raise HTTPException(status_code=400, detail="There is no active plan to pause.")

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
