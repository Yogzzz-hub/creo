"""Negotiation API Router for custom plan consultation and bargain call workflows."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import NotFound
from app.core.logging import get_logger
from app.core.rbac import Actor, get_admin_actor, get_current_actor, require_roles
from app.db.session import get_db
from app.models.billing import Subscription
from app.models.enums import SubscriptionStatus, UserRole
from app.models.negotiation import PlanNegotiation
from app.models.ops import AuditLog
from app.services import payment_service
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
    agreed_amount: int | None = Field(default=None, description="Agreed amount in INR (e.g. 35000)")
    agreed_price: Decimal | None = Field(default=None, description="Agreed price alias")
    action: str | None = "accept"
    counter_price: int | None = None
    counter_note: str | None = None
    decline_reason: str | None = None
    reel_quota: int | None = None
    poster_quota: int | None = None
    story_quota: int | None = None


class NegotiationConfirmPaymentRequest(BaseModel):
    negotiation_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str | None = None


def _format_negotiation(n: PlanNegotiation) -> dict[str, Any]:
    agreed = getattr(n, "agreed_amount", None) or getattr(n, "counter_price", None)
    return {
        "id": str(n.id),
        "client_id": str(n.client_id) if n.client_id else None,
        "clientId": str(n.client_id) if n.client_id else None,
        "client_email": n.client_email,
        "clientEmail": n.client_email,
        "client_name": n.client_name or (n.client_email.split("@")[0] if n.client_email else "Client"),
        "clientName": n.client_name or (n.client_email.split("@")[0] if n.client_email else "Client"),
        "clientLogo": ((n.client_name or n.client_email or "??")[:2].upper()),
        "proposed_budget": n.proposed_budget if hasattr(n, "proposed_budget") else getattr(n, "proposed_offer", None),
        "proposedOffer": getattr(n, "proposed_offer", None) or getattr(n, "proposed_budget", None),
        "contact_phone": getattr(n, "contact_phone", None) or getattr(n, "phone_number", "—"),
        "phoneNumber": getattr(n, "phone_number", None) or getattr(n, "contact_phone", "—"),
        "preferred_window": getattr(n, "preferred_window", None) or getattr(n, "preferred_time", "—"),
        "preferredTime": getattr(n, "preferred_time", None) or getattr(n, "preferred_window", "—"),
        "target_topic": n.target_topic,
        "targetTopic": n.target_topic,
        "notes": n.notes,
        "status": n.status,
        "agreed_amount": agreed,
        "agreedAmount": agreed,
        "counterPrice": agreed,
        "counterNote": getattr(n, "counter_note", None),
        "reelQuota": getattr(n, "reel_quota", None) or 8,
        "posterQuota": getattr(n, "poster_quota", None) or 12,
        "storyQuota": getattr(n, "story_quota", None) or 15,
        "razorpay_custom_plan_id": getattr(n, "razorpay_custom_plan_id", None),
        "order_id": getattr(n, "order_id", None),
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "requestedAt": n.created_at.isoformat() if n.created_at else None,
        "updated_at": getattr(n, "reviewed_at", None).isoformat() if getattr(n, "reviewed_at", None) else (n.created_at.isoformat() if n.created_at else None),
    }


@router.post("/submit", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
async def submit_negotiation(
    payload: NegotiationSubmitRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Client submits a custom plan consultation/bargain call request.

    Kept for older clients; it files the same record as /portal/book-call so there is one
    bargain workflow, not two that drift apart.
    """
    from app.routers.portal_dashboard import PlanBargainCallRequest, book_plan_bargain_call

    phone = payload.contact_phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Contact phone number is required.")
    return await book_plan_bargain_call(
        PlanBargainCallRequest(
            target_topic=payload.target_topic or "Custom Pricing / Retainer Discount",
            proposed_offer=payload.proposed_budget,
            phone_number=phone,
            preferred_time=payload.preferred_window,
            notes=payload.notes,
        ),
        actor,
        db,
    )


get_commercial_actor = require_roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.SALES,
    UserRole.BDE,
    UserRole.BDE_HEAD,
)


@router.patch("/{negotiation_id}/approve", response_model=dict[str, Any])
@router.post("/{negotiation_id}/approve", response_model=dict[str, Any])
async def approve_negotiation(
    negotiation_id: uuid.UUID,
    payload: NegotiationApproveRequest,
    actor: Actor = Depends(get_commercial_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Accept, decline or counter a negotiation.

    This used to approve every request regardless of `action`, so a decline that fell back
    to this route approved the client at a made-up price. It now runs exactly the admin
    workflow, which honours the action and refuses to invent a price.
    """
    from app.routers.admin import NegotiationActionPayload, update_plan_negotiation

    return await update_plan_negotiation(
        negotiation_id,
        NegotiationActionPayload(
            action=(payload.action or "accept").lower(),
            decline_reason=payload.decline_reason,
            counter_price=payload.counter_price,
            counter_note=payload.counter_note,
            agreed_price=payload.agreed_price,
            agreed_amount=Decimal(payload.agreed_amount) if payload.agreed_amount else None,
            reel_quota=payload.reel_quota,
            poster_quota=payload.poster_quota,
            story_quota=payload.story_quota,
        ),
        actor,
        db,
    )


@router.get("", response_model=dict[str, Any])
async def list_negotiations(
    status_filter: str | None = Query(None, alias="status"),
    negotiation_id: uuid.UUID | None = Query(None, alias="id"),
    actor: Actor = Depends(get_commercial_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Admin retrieves all custom plan negotiations, or scoped to BDE contacted clients."""
    from sqlalchemy import or_

    query = select(PlanNegotiation).order_by(desc(PlanNegotiation.created_at))

    if actor.role != UserRole.SUPER_ADMIN:
        query = query.where(PlanNegotiation.agency_id == actor.agency_id)

    # If actor is BDE: only return requests for clients they contact/manage; rest go to admin
    if actor.role in {UserRole.BDE, UserRole.SALES}:
        from app.models.bde import Lead
        from app.models.work import ClientAssignment

        assigned_client_ids = (
            await db.execute(
                select(ClientAssignment.client_id).where(ClientAssignment.user_id == actor.user_id)
            )
        ).scalars().all()

        bde_leads = (
            await db.execute(
                select(Lead).where(Lead.assigned_bde_id == actor.user_id)
            )
        ).scalars().all()

        lead_emails = {l.email.strip().lower() for l in bde_leads if l.email}
        lead_phones = {l.phone.strip() for l in bde_leads if l.phone}
        lead_names = {l.name.strip().lower() for l in bde_leads if l.name}

        filters = [PlanNegotiation.reviewed_by == actor.user_id]
        if assigned_client_ids:
            filters.append(PlanNegotiation.client_id.in_(assigned_client_ids))
        if lead_emails:
            filters.append(func.lower(PlanNegotiation.client_email).in_(lead_emails))
        if lead_phones:
            filters.append(PlanNegotiation.phone_number.in_(lead_phones))
        if lead_names:
            filters.append(func.lower(PlanNegotiation.client_name).in_(lead_names))

        query = query.where(or_(*filters))

    if negotiation_id:
        query = query.where(PlanNegotiation.id == negotiation_id)
    if status_filter:
        query = query.where(func.lower(PlanNegotiation.status) == status_filter.strip().lower())

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
    approved_neg = next((n for n in items if n.status in ("Accepted", "Counter Offered", "APPROVED")), None)
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
    """Client confirms a Razorpay checkout for their negotiated plan.

    The subscription activates only when the checkout signature proves a real payment for
    this exact order. It used to activate on whatever ids the caller sent, which let any
    client obtain a plan without paying.
    """
    client_id = actor.client_id or actor.user_id

    sub = (
        await db.execute(
            select(Subscription)
            .where(
                Subscription.client_id == client_id,
                Subscription.gateway_subscription_id == payload.razorpay_order_id,
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
    ).scalars().first()
    if not sub:
        raise NotFound("Subscription order not found", code="SUBSCRIPTION_NOT_FOUND")

    if sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
        paid = payment_service.verify_checkout_signature(
            payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
        )
        if not (paid or payment_service.sandbox_confirmation_allowed()):
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        await _activate_subscription(db, sub, commit=False)

        db.add(
            AuditLog(
                actor_id=client_id,
                actor_role=actor.role if isinstance(actor.role, UserRole) else None,
                entity="plan_negotiation",
                entity_id=uuid.UUID(payload.negotiation_id) if _is_uuid(payload.negotiation_id) else sub.id,
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


def _is_uuid(value: str | None) -> bool:
    try:
        uuid.UUID(str(value))
    except (ValueError, TypeError):
        return False
    return True
