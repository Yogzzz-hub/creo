import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from celery import shared_task
from sqlalchemy import and_, or_, select

from core.config import settings
from core.database import async_session
from models.enums import AccountStatus
from models.user import User
from services.email import send_email
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)

SIGNUP_RECOVERY_TIERS = [
    {"name": "1h", "min_hours": 1, "max_hours": 2, "redis_ttl": 86400},
    {"name": "2h", "min_hours": 2, "max_hours": 4, "redis_ttl": 86400},
    {"name": "4h", "min_hours": 4, "max_hours": 25, "redis_ttl": 86400},
]


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    return f"{local[:3]}***@{domain}"


def _mask_phone(phone: str) -> str:
    if not phone or len(phone) < 4:
        return "***"
    return f"***{phone[-4:]}"


def _run_async(coroutine):
    return asyncio.run(coroutine)


@shared_task(name="send_email_task", bind=True, max_retries=3)
def send_email_task(self, to_email: str, subject: str, html_content: str) -> None:
    """Generic background task to send an email via Resend."""
    try:
        logger.info("[Celery] Dispatching email to=%s", _mask_email(to_email))
        _run_async(send_email(to_email=to_email, subject=subject, html_content=html_content))
    except Exception as exc:
        logger.error("[Celery] Failed to send email to=%s. Retrying...", _mask_email(to_email))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="send_whatsapp_task", bind=True, max_retries=3)
def send_whatsapp_task(self, phone_number: str, template_id: str, parameters: Dict[str, Any]) -> None:
    """Generic background task to send a WhatsApp template via MSG91."""
    try:
        logger.info("[Celery] Dispatching WhatsApp to=%s", _mask_phone(phone_number))
        _run_async(send_whatsapp_message(phone_number=phone_number, template_id=template_id, parameters=parameters))
    except Exception as exc:
        logger.error("[Celery] Failed to send WhatsApp to=%s. Retrying...", _mask_phone(phone_number))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="notify_incomplete_signup", bind=True, max_retries=3)
def notify_incomplete_signup(self, phone_number: str, first_name: str, checkout_url: str) -> None:
    """PRD Task 9.5: Automated WhatsApp for abandoned sign-ups."""
    try:
        logger.info("[Celery] Sending incomplete sign-up recovery to=%s", _mask_phone(phone_number))
        _run_async(
            send_whatsapp_message(
                phone_number=phone_number,
                template_id="abandoned_cart_recovery",
                parameters={"name": first_name, "link": checkout_url},
            )
        )
    except Exception as exc:
        logger.error("[Celery] Failed to send abandoned cart recovery to=%s. Retrying...", _mask_phone(phone_number))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="notify_payment_failure", bind=True, max_retries=3)
def notify_payment_failure(self, email: str, phone_number: str, first_name: str) -> None:
    """PRD Task 9.7: Multi-channel alert for payment failures."""
    try:
        logger.info("[Celery] Sending payment failure alerts to user")
        html_body = f"""
        <h2>Payment Failed</h2>
        <p>Hi {first_name}, your recent subscription payment failed. Please update your payment method to avoid service interruption.</p>
        <a href="https://creo.app/portal/payments">Update Payment Method</a>
        """
        _run_async(send_email(to_email=email, subject="Action Required: Payment Failed", html_content=html_body))

        if phone_number:
            _run_async(
                send_whatsapp_message(
                    phone_number=phone_number,
                    template_id="payment_failed_alert",
                    parameters={"name": first_name},
                )
            )
    except Exception as exc:
        logger.error("[Celery] Failed to send payment failure notification. Retrying...")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="notify_sales_pricing_issue", bind=True, max_retries=3)
def notify_sales_pricing_issue(self, user_id: str, client_name: str, plan_name: str) -> None:
    """Alert internal sales team when a client requests custom pricing."""
    try:
        logger.info("[Celery] Alerting sales team for user %s", user_id)
        sales_email = "sales@creo.app"
        html_body = f"""
        <h2>Custom Pricing Request</h2>
        <p>Client <b>{client_name}</b> (ID: {user_id}) requested pricing help during the <b>{plan_name}</b> checkout.</p>
        <p>Please reach out via WhatsApp immediately.</p>
        """
        _run_async(send_email(to_email=sales_email, subject=f"Hot Lead: {client_name} Pricing Help", html_content=html_body))
    except Exception as exc:
        logger.error("[Celery] Failed to send sales pricing alert for user %s. Retrying...", user_id)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="process_abandoned_signups")
def process_abandoned_signups() -> None:
    """Scheduled task: finds incomplete sign-ups and sends staggered WhatsApp reminders.

    Deduplication: Uses Redis keys per user per tier with a 24h TTL.
    After sending, the key prevents the same user from receiving the same
    tier's reminder again within 24 hours. If a user completes sign-up
    (account_status changes to active), they are naturally excluded from
    future queries.
    """
    try:
        _run_async(_process_abandoned_signups_async())
    except Exception:
        logger.exception("[Celery] process_abandoned_signups failed")


async def _process_abandoned_signups_async() -> None:
    import redis as redis_lib

    now = datetime.now(timezone.utc)
    min_created = now - timedelta(hours=25)

    async with async_session() as db:
        result = await db.execute(
            select(User).where(
                User.account_status.in_([
                    AccountStatus.pending_verification,
                    AccountStatus.pending_payment,
                ]),
                User.deleted_at.is_(None),
                User.created_at >= min_created,
                User.phone.isnot(None),
            )
        )
        incomplete_users = result.scalars().all()

    if not incomplete_users:
        logger.info("[AbandonedSignups] No incomplete sign-ups found")
        return

    r = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    sent_count = 0

    try:
        for user in incomplete_users:
            age = now - user.created_at
            age_hours = age.total_seconds() / 3600

            for tier in SIGNUP_RECOVERY_TIERS:
                if not (tier["min_hours"] <= age_hours < tier["max_hours"]):
                    continue

                dedup_key = f"abandon_recovery:{user.id}:{tier['name']}"
                if r.exists(dedup_key):
                    continue

                first_name = (user.full_name or "").split()[0] or "there"
                checkout_url = "https://creo.app/signup"

                try:
                    _run_async(
                        send_whatsapp_message(
                            phone_number=user.phone,
                            template_id="abandoned_cart_recovery",
                            parameters={"name": first_name, "link": checkout_url},
                        )
                    )
                    r.setex(dedup_key, tier["redis_ttl"], "1")
                    sent_count += 1
                    logger.info(
                        "[AbandonedSignups] Sent %s-hr reminder to user %s",
                        tier["name"],
                        user.id,
                    )
                except Exception:
                    logger.exception(
                        "[AbandonedSignups] Failed to send %s-hr reminder to user %s",
                        tier["name"],
                        user.id,
                    )
                break

    finally:
        r.close()

    logger.info("[AbandonedSignups] Processed %d users, sent %d reminders", len(incomplete_users), sent_count)
