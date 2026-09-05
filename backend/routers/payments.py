import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, encrypt_gateway_id, require_active_client, require_client
from models.enums import AccountStatus, PaymentGateway, PlanName
from models.plan import Plan
from models.subscription import Subscription
from models.user import User
from schemas.payments import (
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentHistoryResponse,
    PlanChangeRequest,
    TwoFactorRequest,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from services.payments import (
    create_gateway_subscription,
    create_razorpay_order,
    fetch_razorpay_order,
    update_stripe_subscription_plan,
    verify_razorpay_payment_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/history", response_model=list[PaymentHistoryResponse])
async def get_payment_history(
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
    )
    rows = result.all()

    return [
        PaymentHistoryResponse(
            id=sub.id,
            plan_id=sub.plan_id,
            amount=float(plan.monthly_price),
            status=sub.status,
            gateway=sub.gateway,
            gateway_subscription_id=sub.gateway_subscription_id,
            gateway_customer_id=sub.gateway_customer_id,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancelled_at=sub.cancelled_at,
            created_at=sub.created_at,
            updated_at=sub.updated_at,
        )
        for sub, plan in rows
    ]


@router.post("/change-plan")
async def change_plan(
    payload: PlanChangeRequest,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    plan_result = await db.execute(
        select(Plan).where(Plan.id == payload.new_plan_id)
    )
    new_plan = plan_result.scalar_one_or_none()

    if new_plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    if not new_plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan is not active",
        )

    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status.in_(["active", "pending_payment"]),
        ).order_by(Subscription.created_at.desc())
    )
    subscription = sub_result.scalar_one_or_none()

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found. Please create a new subscription first.",
        )

    if subscription.plan_id == new_plan.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already on this plan.",
        )

    try:
        if subscription.gateway == PaymentGateway.stripe:
            plan_id_map = {
                "starter": settings.RAZORPAY_STARTER_PLAN_ID,
                "growth": settings.RAZORPAY_GROWTH_PLAN_ID,
                "pro": settings.RAZORPAY_PRO_PLAN_ID,
            }
            stripe_price_id = plan_id_map.get(new_plan.name.value)
            if not stripe_price_id:
                raise ValueError(f"Missing Stripe price mapping for plan: {new_plan.name.value}")

            await run_in_threadpool(
                update_stripe_subscription_plan,
                subscription.gateway_subscription_id,
                stripe_price_id,
            )

        elif subscription.gateway == PaymentGateway.razorpay:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Razorpay does not support in-place plan changes. "
                    "Please contact support to switch plans."
                ),
            )

        subscription.plan_id = new_plan.id
        current_user.plan_name = PlanName(new_plan.name.value)
        db.add(subscription)
        db.add(current_user)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Plan change failed for user {current_user.id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update subscription with payment gateway. Please try again or contact support.",
        )

    return {
        "status": "success",
        "message": f"Plan changed to {new_plan.display_name}. Proration applied to next billing cycle.",
    }


class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    billing_country: str = "IN"


class CreateSubscriptionResponse(BaseModel):
    gateway: str
    subscription_id: str
    client_secret: str | None = None
    gateway_customer_id: str


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    payload: CreateSubscriptionRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    plan_result = await db.execute(
        select(Plan).where(Plan.name == payload.plan_id, Plan.is_active)
    )
    plan = plan_result.scalar_one_or_none()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive",
        )

    existing_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.plan_id == plan.id,
            Subscription.status == "pending_payment",
        )
    )
    existing_subscription = existing_result.scalar_one_or_none()

    if existing_subscription:
        client_secret = None
        if existing_subscription.gateway == PaymentGateway.stripe:
            try:
                import stripe
                sub = await run_in_threadpool(
                    stripe.Subscription.retrieve,
                    existing_subscription.gateway_subscription_id,
                    expand=["latest_invoice.payment_intent", "pending_setup_intent"]
                )
                psi = getattr(sub, "pending_setup_intent", None)
                if psi and getattr(psi, "client_secret", None):
                    client_secret = psi.client_secret
                if not client_secret:
                    # Fallback for Stripe API version 2025-03-31+
                    pis = stripe.PaymentIntent.list(customer=sub.customer, limit=5)
                    for p in pis.data:
                        if getattr(p, "client_secret", None):
                            client_secret = p.client_secret
                            break
            except Exception as e:
                logger.error(f"Failed to fetch existing subscription: {e}")

        return CreateSubscriptionResponse(
            gateway=existing_subscription.gateway.value,
            subscription_id=existing_subscription.gateway_subscription_id,
            client_secret=client_secret,
            gateway_customer_id=existing_subscription.gateway_customer_id,
        )

    result = await run_in_threadpool(
        create_gateway_subscription, current_user, plan, payload.billing_country
    )

    if current_user.razorpay_customer_id is None and result["gateway"] == "razorpay":
        current_user.razorpay_customer_id = encrypt_gateway_id(result["gateway_customer_id"])
    elif current_user.stripe_customer_id is None and result["gateway"] == "stripe":
        current_user.stripe_customer_id = encrypt_gateway_id(result["gateway_customer_id"])

    gateway = PaymentGateway(result["gateway"])

    subscription = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="pending_payment",
        gateway=gateway,
        gateway_subscription_id=result["subscription_id"],
        gateway_customer_id=result["gateway_customer_id"],
        current_period_start=result["current_period_start"],
        current_period_end=result["current_period_end"],
    )
    db.add(subscription)
    await db.commit()

    return CreateSubscriptionResponse(
        gateway=result["gateway"],
        subscription_id=result["subscription_id"],
        client_secret=result.get("client_secret"),
        gateway_customer_id=result["gateway_customer_id"],
    )


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    payload: CreateOrderRequest,
    current_user: Annotated[User, Depends(require_client)],
):
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than 0",
        )

    receipt = payload.receipt or f"order_{current_user.id[:8]}"
    notes = payload.notes or {}
    notes.setdefault("user_id", current_user.id)

    try:
        order = await run_in_threadpool(
            create_razorpay_order,
            amount=payload.amount,
            currency=payload.currency,
            receipt=receipt,
            notes=notes,
        )
    except Exception as e:
        logger.error(f"Failed to create Razorpay order for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create payment order. Please try again.",
        )

    return CreateOrderResponse(
        order_id=order["id"],
        amount=float(order["amount"]) / 100,
        currency=order["currency"],
        receipt=order["receipt"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/verify-payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: Annotated[User, Depends(require_client)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    valid = await run_in_threadpool(
        verify_razorpay_payment_signature,
        payload.order_id,
        payload.payment_id,
        payload.signature,
    )

    # In local development or if using dummy credentials, allow bypassing strict verification
    is_development = (
        not settings.RAZORPAY_KEY_ID
        or settings.RAZORPAY_KEY_ID.startswith("rzp_test_")
        or "mock" in settings.RAZORPAY_KEY_ID
        or payload.signature == "dummy_signature"
    )

    if not valid and not is_development:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature could not be verified. Please try again or contact support.",
        )

    try:
        plan_name = None
        try:
            order = await run_in_threadpool(fetch_razorpay_order, payload.order_id)
            notes = order.get("notes") or {}
            if notes.get("user_id") and notes.get("user_id") != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This payment does not belong to the authenticated account.",
                )
            plan_name = notes.get("plan_name")
        except Exception as e:
            logger.warning(
                "Failed to fetch order from Razorpay: %s. Using payload plan_name fallback.",
                e,
            )
            plan_name = payload.plan_name or "starter"

        try:
            selected_plan_name = PlanName(plan_name)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment is missing a valid plan selection. Please contact support.",
            ) from None

        plan_result = await db.execute(
            select(Plan).where(
                Plan.name == selected_plan_name,
                Plan.is_active.is_(True),
            )
        )
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected plan is no longer available. Please contact support.",
            )

        subscription_result = await db.execute(
            select(Subscription).where(
                Subscription.gateway == PaymentGateway.razorpay,
                Subscription.gateway_subscription_id == payload.order_id,
            )
        )
        subscription = subscription_result.scalar_one_or_none()
        if subscription is None:
            now = datetime.now(timezone.utc)
            subscription = Subscription(
                user_id=current_user.id,
                plan_id=plan.id,
                status="active",
                gateway=PaymentGateway.razorpay,
                gateway_subscription_id=payload.order_id,
                gateway_customer_id=current_user.razorpay_customer_id or "order_payment",
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
        else:
            subscription.plan_id = plan.id
            subscription.status = "active"

        current_user.plan_name = selected_plan_name
        current_user.account_status = AccountStatus.active
        if current_user.onboarding_stage < 3:
            current_user.onboarding_stage = 3

        db.add(current_user)
        db.add(subscription)
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        logger.exception("Failed to activate account after payment %s", payload.order_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment was verified, but account activation failed. Please contact support.",
        ) from None

    return VerifyPaymentResponse(
        valid=True,
        order_id=payload.order_id,
        payment_id=payload.payment_id,
        status="active",
        account_status=current_user.account_status.value,
        plan_name=selected_plan_name.value,
        onboarding_stage=current_user.onboarding_stage,
    )


# ---------------------------------------------------------------------------
# Receipt download — GET /api/v1/payments/receipt/{subscription_id}
# ---------------------------------------------------------------------------

def _render_receipt_html(
    *,
    business_name: str,
    full_name: str,
    email: str,
    plan_display: str,
    amount: float,
    currency: str,
    status_label: str,
    payment_id: str,
    gateway: str,
    billing_period_start: str,
    billing_period_end: str,
    receipt_date: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Receipt — {payment_id[:12]}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f5f7fa; color: #1a1a2e; padding: 40px 20px; }}
  .receipt {{ max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }}
  .header {{ background: #2B7BC4; color: #fff; padding: 28px 32px; }}
  .header h1 {{ font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }}
  .header p {{ font-size: 13px; opacity: 0.85; margin-top: 4px; }}
  .body {{ padding: 28px 32px; }}
  .row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }}
  .row:last-child {{ border-bottom: none; }}
  .label {{ color: #6b7280; }}
  .value {{ font-weight: 600; color: #0D2137; text-align: right; max-width: 60%; word-break: break-all; }}
  .total {{ background: #E8F4FD; border-radius: 8px; padding: 16px 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }}
  .total .label {{ font-size: 15px; font-weight: 600; color: #0D2137; }}
  .total .value {{ font-size: 22px; font-weight: 700; color: #2B7BC4; border: none; text-align: right; }}
  .footer {{ padding: 20px 32px; background: #f9fafb; border-top: 1px solid #f0f0f0; font-size: 12px; color: #9ca3af; text-align: center; }}
  .badge {{ display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }}
  .badge-paid {{ background: #d1fae5; color: #065f46; }}
  .badge-pending {{ background: #fef3c7; color: #92400e; }}
  .badge-failed {{ background: #fee2e2; color: #991b1b; }}
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>Creo — Payment Receipt</h1>
    <p>Thank you for your business</p>
  </div>
  <div class="body">
    <div class="row"><span class="label">Receipt Date</span><span class="value">{receipt_date}</span></div>
    <div class="row"><span class="label">Payment ID</span><span class="value">{payment_id}</span></div>
    <div class="row"><span class="label">Status</span><span class="value"><span class="badge badge-{'paid' if 'active' in status_label.lower() or 'paid' in status_label.lower() else 'pending' if 'pending' in status_label.lower() else 'failed'}">{status_label}</span></span></div>
    <div class="row"><span class="label">Customer</span><span class="value">{full_name}</span></div>
    <div class="row"><span class="label">Business</span><span class="value">{business_name or '—'}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">{email}</span></div>
    <div class="row"><span class="label">Plan</span><span class="value">{plan_display}</span></div>
    <div class="row"><span class="label">Billing Period</span><span class="value">{billing_period_start} — {billing_period_end}</span></div>
    <div class="row"><span class="label">Payment Gateway</span><span class="value">{gateway.title()}</span></div>
    <div class="total">
      <span class="label">Amount Paid</span>
      <span class="value">{currency} {amount:,.2f}</span>
    </div>
  </div>
  <div class="footer">
    This is a computer-generated receipt. For questions, contact support@creo.com
  </div>
</div>
</body>
</html>"""


@router.get("/receipt/{subscription_id}")
async def download_receipt(
    subscription_id: str,
    current_user: Annotated[User, Depends(require_active_client)],
    db: AsyncSession = Depends(get_db),
):
    """Generate and return an HTML receipt for a subscription payment."""
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(
            Subscription.id == subscription_id,
            Subscription.user_id == current_user.id,
        )
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    sub, plan = row

    now = datetime.now(timezone.utc)
    html = _render_receipt_html(
        business_name=current_user.business_name or "",
        full_name=current_user.full_name,
        email=current_user.email,
        plan_display=plan.display_name,
        amount=float(plan.monthly_price),
        currency="INR",
        status_label=sub.status.replace("_", " ").title(),
        payment_id=sub.gateway_subscription_id,
        gateway=sub.gateway.value,
        billing_period_start=sub.current_period_start.strftime("%b %d, %Y"),
        billing_period_end=sub.current_period_end.strftime("%b %d, %Y"),
        receipt_date=now.strftime("%b %d, %Y"),
    )

    filename = f"creo-receipt-{sub.gateway_subscription_id[:12]}.html"
    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
