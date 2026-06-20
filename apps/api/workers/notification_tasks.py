import asyncio
import logging
from typing import Any, Dict

from celery import shared_task

from services.email import send_email
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)

# Helper to run async service functions inside synchronous Celery tasks
def _run_async(coroutine):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coroutine)


@shared_task(name="send_email_task", bind=True, max_retries=3)
def send_email_task(self, to_email: str, subject: str, html_content: str) -> None:
    """Generic background task to send an email via Resend."""
    try:
        logger.info(f"[Celery] Dispatching email to {to_email}")
        _run_async(send_email(to_email=to_email, subject=subject, html_content=html_content))
    except Exception as exc:
        logger.error(f"[Celery] Failed to send email to {to_email}. Retrying...")
        raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds


@shared_task(name="send_whatsapp_task", bind=True, max_retries=3)
def send_whatsapp_task(self, phone_number: str, template_id: str, parameters: Dict[str, Any]) -> None:
    """Generic background task to send a WhatsApp template via MSG91."""
    try:
        logger.info(f"[Celery] Dispatching WhatsApp to {phone_number}")
        _run_async(send_whatsapp_message(phone_number=phone_number, template_id=template_id, parameters=parameters))
    except Exception as exc:
        logger.error(f"[Celery] Failed to send WhatsApp to {phone_number}. Retrying...")
        raise self.retry(exc=exc, countdown=60)


@shared_task(name="notify_incomplete_signup")
def notify_incomplete_signup(phone_number: str, first_name: str, checkout_url: str) -> None:
    """PRD Task 9.5: Automated WhatsApp for abandoned sign-ups."""
    logger.info(f"[Celery] Sending incomplete sign-up recovery to {phone_number}")
    _run_async(
        send_whatsapp_message(
            phone_number=phone_number,
            template_id="abandoned_cart_recovery",  # Must match MSG91 approved template
            parameters={"name": first_name, "link": checkout_url}
        )
    )


@shared_task(name="notify_payment_failure")
def notify_payment_failure(email: str, phone_number: str, first_name: str) -> None:
    """PRD Task 9.7: Multi-channel alert for payment failures."""
    logger.info(f"[Celery] Sending payment failure alerts to {email} / {phone_number}")
    
    # 1. Send Email
    html_body = f"""
    <h2>Payment Failed</h2>
    <p>Hi {first_name}, your recent subscription payment failed. Please update your payment method to avoid service interruption.</p>
    <a href="https://creo.app/portal/payments">Update Payment Method</a>
    """
    _run_async(send_email(to_email=email, subject="Action Required: Payment Failed", html_content=html_body))

    # 2. Send WhatsApp
    if phone_number:
        _run_async(
            send_whatsapp_message(
                phone_number=phone_number,
                template_id="payment_failed_alert",
                parameters={"name": first_name}
            )
        )


@shared_task(name="notify_sales_pricing_issue")
def notify_sales_pricing_issue(user_id: str, client_name: str, plan_name: str) -> None:
    """Alert internal sales team when a client requests custom pricing."""
    logger.info(f"[Celery] Alerting sales team for user {user_id}")
    
    sales_email = "sales@creo.app"
    html_body = f"""
    <h2>Custom Pricing Request</h2>
    <p>Client <b>{client_name}</b> (ID: {user_id}) requested pricing help during the <b>{plan_name}</b> checkout.</p>
    <p>Please reach out via WhatsApp immediately.</p>
    """
    _run_async(send_email(to_email=sales_email, subject=f"Hot Lead: {client_name} Pricing Help", html_content=html_body))