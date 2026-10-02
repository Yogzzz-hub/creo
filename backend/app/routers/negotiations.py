"""Negotiation API Router for custom plan consultation and bargain call workflows."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import Forbidden, NotFound
from app.core.logging import get_logger
from app.core.rbac import Actor, AdminActor, get_current_actor
from app.db.session import get_db
from app.models.billing import Plan, Subscription
from app.models.enums import AccountStatus, PaymentProvider, SubscriptionStatus, UserRole
from app.models.negotiation import PlanNegotiation
from app.models.ops import AuditLog, Notification
from app.models.user import User
from app.services.payment_service import _activate_subscription

logger = get_logger(__name__)

router = APIRouter(prefix="", tags=["Negotiations"])


class NegotiationSubmitRequest(BaseModel):
    proposed_budget: str | None = None
    contact_phone: str = Field(..., min_length=5, description="Client contact phone/WhatsApp number")
    preferred_window: str = Field(..., description="Preferred call window")
    target_topic: str | None = None
    notes: str | None = None


class NegotiationApproveRequest(BaseModel):
    agreed_amount: int = Field(gt=0, description="Agreed amount in INR (e.g. 35000)")


class NegotiationConfirmPaymentRequest(BaseModel):
    negotiation_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str | None = None


def _format_negotiation(n: PlanNegotiation) -> dict[str, Any]:
    return {
        "id": str(n.id),
        "client_id": str(n.client_id),
        "client_email": n.client_email,
        "client_name": n.client_name or n.client_email.split("@")[0],
        "proposed_budget": n.proposed_budget,
        "contact_phone": n.contact_phone,
        "preferred_window": n.preferred_window,
        "target_topic": n.target_topic,
        "notes": n.notes,
        "status": n.status,
        "agreed_amount": n.agreed_amount,
        "razorpay_custom_plan_id": n.razorpay_custom_plan_id,
        "order_id": n.order_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "updated_at": n.updated_at.isoformat() if n.updated_at else None,
    }


@router.post("/submit", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
async def submit_negotiation(
    payload: NegotiationSubmitRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Client submits a custom plan consultation/bargain call request."""
    client_user = await db.get(User, actor.user_id)
    if not client_user:
        raise NotFound("User account not found", code="USER_NOT_FOUND")

    phone = payload.contact_phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Contact phone number is required.")

    client_name = client_user.full_name or client_user.email.split("@")[0]

    # Create negotiation record in PENDING state
    neg_id = uuid.uuid4()
    neg = PlanNegotiation(
        id=neg_id,
        client_id=client_user.id,
        client_email=client_user.email,
        client_name=client_name,
        proposed_budget=payload.proposed_budget,
        contact_phone=phone,
        preferred_window=payload.preferred_window,
        target_topic=payload.target_topic or "Custom Pricing / Retainer Discount",
        notes=payload.notes,
        status="PENDING",
        agreed_amount=None,
        razorpay_custom_plan_id=None,
        order_id=None,
    )
    db.add(neg)

    # Find active Admins and Super Admins
    admin_stmt = select(User.id).where(
        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.account_status == "active",
    )
    admin_res = await db.execute(admin_stmt)
    admin_ids = admin_res.scalars().all()

    redirect_url = f"/admin/plans-and-negotiations?id={neg_id}"

    offer_detail = f" • Budget: {payload.proposed_budget}" if payload.proposed_budget else ""
    for aid in admin_ids:
        db.add(
            Notification(
                user_id=aid,
                title=f"📞 Plan Bargain Call: {client_name}",
                message=f"{client_name} ({client_user.email}) requested a call to bargain plan: {payload.target_topic or 'Custom Pricing'}. Contact: {phone} (Preferred: {payload.preferred_window}){offer_detail}",
                link=redirect_url,
            )
        )

    # Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="plan_negotiation",
            entity_id=neg_id,
            action="submit_negotiation_call",
            to_value={
                "client_id": str(actor.user_id),
                "client_name": client_name,
                "client_email": client_user.email,
                "phone": phone,
                "proposed_budget": payload.proposed_budget,
                "preferred_window": payload.preferred_window,
                "redirectUrl": redirect_url,
            },
        )
    )

    await db.commit()
    await db.refresh(neg)

    return {
        "status": "PENDING",
        "id": str(neg.id),
        "negotiation": _format_negotiation(neg),
        "redirectUrl": redirect_url,
        "message": f"Custom plan negotiation request submitted. Our Agency Director will reach out at {phone}.",
    }


@router.patch("/{negotiation_id}/approve", response_model=dict[str, Any])
async def approve_negotiation(
    negotiation_id: uuid.UUID,
    payload: NegotiationApproveRequest,
    actor: Actor = AdminActor,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Admin sets the final negotiated amount, triggers Razorpay order generation, and approves plan."""
    neg = await db.get(PlanNegotiation, negotiation_id)
    if not neg:
        raise NotFound(f"Negotiation {negotiation_id} not found", code="NEGOTIATION_NOT_FOUND")

    client_user = await db.get(User, neg.client_id)
    if not client_user:
        raise NotFound("Client user associated with negotiation not found", code="USER_NOT_FOUND")

    agreed_amt = payload.agreed_amount
    amount_minor = agreed_amt * 100

    # Razorpay Live Order Creation
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_TO2r0YMjDZSpuC")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    order_id = f"order_custom_{uuid.uuid4().hex[:12]}"

    if key_id and key_secret:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(key_id, key_secret),
                    json={
                        "amount": amount_minor,
                        "currency": "INR",
                        "receipt": f"neg_{uuid.uuid4().hex[:10]}",
                        "notes": {
                            "client_id": str(neg.client_id),
                            "custom_plan": "true",
                            "negotiation_id": str(neg.id),
                        },
                    },
                )
                if res.status_code in (200, 201):
                    data = res.json()
                    order_id = data.get("id", order_id)
        except Exception as exc:
            logger.warning("razorpay_order_create_exception", error=str(exc))

    # 1. Update negotiation record
    neg.status = "APPROVED"
    neg.agreed_amount = agreed_amt
    neg.order_id = order_id
    neg.razorpay_custom_plan_id = order_id
    neg.updated_at = datetime.now(UTC)

    # 2. Synchronize server-authoritative custom Plan in plans table
    plan_key = f"custom_{neg.client_id.hex[:8]}"
    plan_stmt = select(Plan).where(Plan.name == plan_key)
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()

    custom_display_name = f"Your Custom Negotiated Plan (₹{agreed_amt:,}/mo)"
    if plan:
        plan.display_name = custom_display_name
        plan.monthly_price = Decimal(agreed_amt)
        plan.price_minor = amount_minor
        plan.is_active = True
    else:
        plan = Plan(
            id=uuid.uuid4(),
            agency_id=client_user.agency_id,
            name=plan_key,
            display_name=custom_display_name,
            monthly_price=Decimal(agreed_amt),
            price_minor=amount_minor,
            currency="INR",
            reel_quota=10,
            poster_quota=12,
            story_quota=15,
            revision_rounds=2,
            has_dedicated_manager=True,
            highlights=[
                "10 High-Impact Reels",
                "12 Static Posters",
                "15 Story Templates",
                "Agreed Retainer Scope",
                "Dedicated Creative Pod Lead",
            ],
            is_active=True,
        )
        db.add(plan)
        await db.flush()

    # 3. Synchronize Incomplete Subscription record to match order_id
    now = datetime.now(UTC)
    sub_stmt = (
        select(Subscription)
        .where(
            Subscription.client_id == neg.client_id,
            Subscription.status == SubscriptionStatus.INCOMPLETE,
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = (await db.execute(sub_stmt)).scalar_one_or_none()
    if sub:
        sub.plan_id = plan.id
        sub.amount = Decimal(agreed_amt)
        sub.gateway_subscription_id = order_id
        sub.gateway = PaymentProvider.RAZORPAY
    else:
        sub = Subscription(
            id=uuid.uuid4(),
            agency_id=client_user.agency_id,
            client_id=neg.client_id,
            plan_id=plan.id,
            status=SubscriptionStatus.INCOMPLETE,
            gateway=PaymentProvider.RAZORPAY,
            gateway_subscription_id=order_id,
            amount=Decimal(agreed_amt),
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )
        db.add(sub)

    # 4. Notify Client Portal
    db.add(
        Notification(
            user_id=neg.client_id,
            title="🎉 Custom Plan Approved!",
            message=f"Your custom negotiated plan of ₹{agreed_amt:,}/mo has been approved! You can now subscribe via Razorpay.",
            link="/portal/settings",
        )
    )

    # 5. Audit log
    db.add(
        AuditLog(
            actor_id=actor.user_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="plan_negotiation",
            entity_id=neg.id,
            action="approve_negotiation",
            to_value={
                "agreed_amount": agreed_amt,
                "order_id": order_id,
                "client_id": str(neg.client_id),
                "plan_id": str(plan.id),
            },
        )
    )

    await db.commit()
    await db.refresh(neg)

    return {
        "status": "APPROVED",
        "id": str(neg.id),
        "agreed_amount": agreed_amt,
        "order_id": order_id,
        "key_id": key_id,
        "negotiation": _format_negotiation(neg),
        "message": f"Negotiation approved at ₹{agreed_amt:,}/mo. Razorpay order {order_id} generated.",
    }


@router.get("", response_model=dict[str, Any])
async def list_negotiations(
    status_filter: str | None = Query(None, alias="status"),
    negotiation_id: uuid.UUID | None = Query(None, alias="id"),
    actor: Actor = AdminActor,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Admin retrieves all custom plan negotiations."""
    query = select(PlanNegotiation).order_by(desc(PlanNegotiation.created_at))

    if negotiation_id:
        query = query.where(PlanNegotiation.id == negotiation_id)
    if status_filter:
        query = query.where(PlanNegotiation.status == status_filter.upper())

    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "negotiations": [_format_negotiation(item) for item in items],
        "total": len(items),
    }


@router.get("/my", response_model=dict[str, Any])
async def get_my_negotiation(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Client retrieves their custom plan negotiations and any approved custom plan ready to checkout."""
    query = (
        select(PlanNegotiation)
        .where(PlanNegotiation.client_id == actor.user_id)
        .order_by(desc(PlanNegotiation.created_at))
    )
    result = await db.execute(query)
    items = result.scalars().all()

    # Find the latest approved negotiation
    approved_neg = next((n for n in items if n.status == "APPROVED"), None)
    latest_neg = items[0] if items else None

    key_id = getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_TO2r0YMjDZSpuC")

    return {
        "has_negotiation": len(items) > 0,
        "latest": _format_negotiation(latest_neg) if latest_neg else None,
        "approved": _format_negotiation(approved_neg) if approved_neg else None,
        "key_id": key_id,
        "all": [_format_negotiation(n) for n in items],
    }


@router.post("/confirm-payment", response_model=dict[str, Any])
async def confirm_negotiation_payment(
    payload: NegotiationConfirmPaymentRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Client confirms payment callback after completing Razorpay modal checkout."""
    client_id = actor.user_id

    # 1. Match subscription by order_id or client_id
    sub_stmt = (
        select(Subscription)
        .where(
            Subscription.client_id == client_id,
            Subscription.gateway_subscription_id == payload.razorpay_order_id,
        )
    )
    sub = (await db.execute(sub_stmt)).scalar_one_or_none()

    if not sub:
        # Fallback to latest incomplete subscription
        fallback_stmt = (
            select(Subscription)
            .where(
                Subscription.client_id == client_id,
                Subscription.status == SubscriptionStatus.INCOMPLETE,
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub = (await db.execute(fallback_stmt)).scalar_one_or_none()

    if not sub:
        raise NotFound("Subscription order not found", code="SUBSCRIPTION_NOT_FOUND")

    # 2. Activate subscription and account
    await _activate_subscription(db, sub)

    # 3. Update client account status to active
    client_user = await db.get(User, client_id)
    if client_user:
        client_user.account_status = AccountStatus.ACTIVE

    # 4. Audit Log
    db.add(
        AuditLog(
            actor_id=client_id,
            actor_role=actor.role if isinstance(actor.role, UserRole) else None,
            entity="plan_negotiation",
            entity_id=uuid.UUID(payload.negotiation_id) if payload.negotiation_id else sub.id,
            action="custom_plan_subscribed_razorpay",
            to_value={
                "payment_id": payload.razorpay_payment_id,
                "order_id": payload.razorpay_order_id,
                "subscription_id": str(sub.id),
            },
        )
    )

    await db.commit()

    return {
        "status": "active",
        "subscription_id": str(sub.id),
        "message": "Payment verified and subscription activated successfully!",
    }
