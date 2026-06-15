import razorpay
import stripe
from datetime import datetime, timezone

from core.config import settings
from models.plan import Plan
from models.user import User


razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_razorpay_customer(user: User) -> dict:
    customer = razorpay_client.customer.create(
        name=user.full_name,
        email=user.email,
        contact=user.phone or None,
    )
    return customer


def create_razorpay_subscription(user: User, plan: Plan, razorpay_customer_id: str) -> dict:
    plan_id_map = {
        "starter": settings.RAZORPAY_STARTER_PLAN_ID,
        "growth": settings.RAZORPAY_GROWTH_PLAN_ID,
        "pro": settings.RAZORPAY_PRO_PLAN_ID,
    }
    gateway_plan_id = plan_id_map.get(plan.name.value, "")

    subscription = razorpay_client.subscription.create(
        plan_id=gateway_plan_id,
        customer_id=razorpay_customer_id,
        total_count=12,
        notify_by_sms=False,
        notify_by_email=False,
    )

    return {
        "gateway": "razorpay",
        "subscription_id": subscription["id"],
        "gateway_customer_id": razorpay_customer_id,
        "status": subscription.get("status", "pending"),
        "current_period_start": (
            datetime.fromtimestamp(subscription["current_start"], tz=timezone.utc)
            if subscription.get("current_start")
            else None
        ),
        "current_period_end": (
            datetime.fromtimestamp(subscription["current_end"], tz=timezone.utc)
            if subscription.get("current_end")
            else None
        ),
    }


def create_stripe_customer(user: User) -> stripe.Customer:
    customer = stripe.Customer.create(
        name=user.full_name,
        email=user.email,
        phone=user.phone or None,
        metadata={"user_id": user.id},
    )
    return customer


def create_stripe_subscription(user: User, plan: Plan, stripe_customer_id: str) -> dict:
    price_amount = int(float(plan.monthly_price) * 100)

    stripe_price = stripe.Price.create(
        unit_amount=price_amount,
        currency="usd",
        recurring={"interval": "month"},
        product_data={
            "name": f"Creo {plan.display_name} Plan",
        },
    )

    subscription = stripe.Subscription.create(
        customer=stripe_customer_id,
        items=[{"price": stripe_price.id}],
        payment_behavior="default_incomplete",
        expand=["latest_invoice.payment_intent"],
    )

    client_secret = None
    if subscription.latest_invoice and hasattr(subscription.latest_invoice, "payment_intent"):
        client_secret = subscription.latest_invoice.payment_intent.client_secret

    return {
        "gateway": "stripe",
        "subscription_id": subscription.id,
        "gateway_customer_id": stripe_customer_id,
        "status": subscription.status,
        "client_secret": client_secret,
        "current_period_start": datetime.fromtimestamp(
            subscription.current_period_start, tz=timezone.utc
        ),
        "current_period_end": datetime.fromtimestamp(
            subscription.current_period_end, tz=timezone.utc
        ),
    }


def create_gateway_subscription(user: User, plan: Plan, country_code: str) -> dict:
    if country_code.upper() == "IN":
        if not user.razorpay_customer_id:
            customer = create_razorpay_customer(user)
            user.razorpay_customer_id = customer["id"]

        result = create_razorpay_subscription(
            user, plan, user.razorpay_customer_id
        )
        return result
    else:
        if not user.stripe_customer_id:
            customer = create_stripe_customer(user)
            user.stripe_customer_id = customer.id

        result = create_stripe_subscription(
            user, plan, user.stripe_customer_id
        )
        return result


def verify_razorpay_signature(payload_body: bytes, signature: str) -> dict:
    return razorpay_client.utility.verify_webhook_signature(
        payload_body.decode("utf-8"),
        signature,
        settings.RAZORPAY_WEBHOOK_SECRET,
    )


def verify_stripe_signature(payload_body: bytes, signature_header: str) -> stripe.Event:
    return stripe.Webhook.construct_event(
        payload_body,
        signature_header,
        settings.STRIPE_WEBHOOK_SECRET,
    )
    )
