import logging
from datetime import datetime, timezone
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
from schemas.payments import PaymentHistoryResponse, PlanChangeRequest
from services.payments import (
    create_gateway_subscription,
    update_stripe_subscription_plan,
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
        return CreateSubscriptionResponse(
            gateway=existing_subscription.gateway.value,
            subscription_id=existing_subscription.gateway_subscription_id,
            client_secret=None,
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
