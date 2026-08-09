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


LEAD_MAGNET_DOWNLOAD_URL = "https://rndrwcgjmbnhixkurara.supabase.co/storage/v1/object/public/Template/Template%20plan.jpeg"

CALENDAR_ROWS = [
    ("Monday", "Story", "Behind-the-scenes of your workspace or team"),
    ("Tuesday", "Poster", "Educational tip or FAQ carousel"),
    ("Wednesday", "Story", "Poll or question sticker to boost engagement"),
    ("Thursday", "Poster", "Customer testimonial or case study"),
    ("Friday", "Story", "Product/service spotlight with a CTA"),
    ("Saturday", "Reel", "Trending audio or how-to tutorial"),
    ("Sunday", "Reel", "Brand story or lifestyle content"),
]


def _build_lead_magnet_html(email: str) -> str:
    username = email.split("@")[0]
    calendar_rows_html = "\n".join(
        f"""
        <tr style="border-bottom:1px solid #C9DFF0;">
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#0D2137;">{day}</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#2B7BC4;">{typ}</td>
          <td style="padding:10px 8px;font-size:13px;color:#374151;">{tip}</td>
        </tr>"""
        for day, typ, tip in CALENDAR_ROWS
    )

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="background:#E8F4FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:40px auto;max-width:600px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(13,33,55,0.08);overflow:hidden;">
  <tr>
    <td style="background:#0D2137;padding:32px 40px;text-align:center;">
      <div style="color:#2B7BC4;font-size:28px;font-weight:700;">Creo</div>
      <div style="color:#6BAED6;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">Digital Marketing, Delivered.</div>
    </td>
  </tr>
  <tr>
    <td style="padding:40px;">
      <h1 style="color:#0D2137;font-size:24px;font-weight:700;margin:0 0 16px;text-align:center;">Your 30-Day Content Calendar is Ready</h1>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">Hi {username},</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">You just made a smart move. This isn't a generic spreadsheet — it's the exact content framework our agency uses to manage <strong>50+ local businesses</strong> and deliver over <strong>1,200 pieces of content every month</strong>.</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">Inside, you'll find a structured 30-day posting schedule designed specifically for local businesses like yours — with the right content types on the right days to maximize reach and engagement.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;text-align:center;width:100%;">
        <tr><td>
          <a href="{LEAD_MAGNET_DOWNLOAD_URL}" style="background:#2B7BC4;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;">Download Your Free Template</a>
        </td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #C9DFF0;margin:0;">
      <h2 style="color:#0D2137;font-size:18px;font-weight:600;margin:24px 0 12px;">Your Weekly Content Framework</h2>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">Each week follows this proven rhythm — posters and stories on weekdays for consistency, high-reach reels on weekends for growth.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#E8F4FD;border-radius:8px;padding:16px;margin:16px 0;">
        <tr style="border-bottom:1px solid #C9DFF0;">
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#0D2137;">Day</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#0D2137;">Type</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#0D2137;">Content Idea</td>
        </tr>
        {calendar_rows_html}
      </table>
      <hr style="border:none;border-top:1px solid #C9DFF0;margin:0;">
      <h2 style="color:#0D2137;font-size:18px;font-weight:600;margin:24px 0 12px;">What Happens Next?</h2>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 8px;">&#10003; Use the calendar to plan your first 30 days of content</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 8px;">&#10003; Customize the topics to match your brand and audience</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 8px;">&#10003; Schedule posts in advance for a consistent presence</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">&#10003; See measurable growth within the first month</p>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px;">Want us to handle this for you? Creo manages everything — strategy, creation, scheduling, and analytics — so you can focus on running your business.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;text-align:center;width:100%;">
        <tr><td>
          <a href="https://creo.app/pricing" style="background:#0D2137;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;">See Our Plans</a>
        </td></tr>
      </table>
      <p style="color:#374151;font-size:15px;line-height:24px;margin:24px 0 0;">Cheers,<br>The Creo Team</p>
    </td>
  </tr>
  <tr><td><hr style="border:none;border-top:1px solid #C9DFF0;margin:0;"></td></tr>
  <tr>
    <td style="padding:24px 40px;text-align:center;">
      <p style="color:#6BAED6;font-size:12px;line-height:18px;margin:0 0 4px;">&copy; {datetime.now(timezone.utc).year} Creo &mdash; Digital Marketing Agency Platform</p>
      <p style="color:#6BAED6;font-size:12px;line-height:18px;margin:0 0 4px;">You received this because you downloaded our free content calendar template at creo.app.</p>
      <p style="color:#6BAED6;font-size:12px;line-height:18px;margin:0;"><a href="https://creo.app/unsubscribe" style="color:#6BAED6;text-decoration:underline;">Unsubscribe</a></p>
    </td>
  </tr>
</table>
</body>
</html>"""


@shared_task(name="send_lead_magnet_email", bind=True, max_retries=3)
def send_lead_magnet_email(self, email: str) -> None:
    """Send the 30-day content calendar template email to a lead magnet subscriber."""
    try:
        logger.info("[Celery] Sending lead magnet email to=%s", _mask_email(email))
        html_body = _build_lead_magnet_html(email)
        _run_async(
            send_email(
                to_email=email,
                subject="Your Free 30-Day Content Calendar Template",
                html_content=html_body,
            )
        )
        logger.info("[Celery] Lead magnet email sent to=%s", _mask_email(email))
    except Exception as exc:
        logger.error("[Celery] Failed to send lead magnet email to=%s. Retrying...", _mask_email(email))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(name="notify_sales_lead_capture", bind=True, max_retries=3)
def notify_sales_lead_capture(self, email: str) -> None:
    """Log lead capture for the sales team pipeline context."""
    try:
        logger.info("[Celery] Notifying sales team of new lead: %s", _mask_email(email))
        sales_email = "sales@creo.app"
        html_body = f"""
        <h2>New Lead Magnet Capture</h2>
        <p>A new lead has been captured from the landing page content calendar download.</p>
        <p><b>Email:</b> {email}</p>
        <p><b>Source:</b> Landing Page — Lead Magnet Banner</p>
        <p><b>Action:</b> Add to CRM pipeline for follow-up. This user downloaded our free content calendar template, indicating interest in social media content management.</p>
        <p><a href="https://creo.app/admin/sales">View Sales Pipeline</a></p>
        """
        _run_async(
            send_email(
                to_email=sales_email,
                subject=f"New Lead: {email} downloaded Content Calendar",
                html_content=html_body,
            )
        )
        logger.info("[Celery] Sales notification sent for lead=%s", _mask_email(email))
    except Exception as exc:
        logger.error("[Celery] Failed to notify sales team for lead=%s. Retrying...", _mask_email(email))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


#send_verification_email_task

@shared_task(name="send_verification_email", bind=True, max_retries=3)
def send_verification_email_task(self, email: str, verification_link: str) -> None:
    """
    Task T5.1: Sends the email verification link to the client during Module 3 onboarding.
    """
    try:
        logger.info("[Celery] Sending verification email to=%s", _mask_email(email))
        
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D2137; font-size: 22px; margin-bottom: 16px;">Verify your email address</h2>
            <p style="color: #374151; font-size: 15px; line-height: 24px; margin-bottom: 24px;">
                Thank you for creating an account with Creo. To complete your registration and proceed to onboarding, please verify your email address by clicking the button below.
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                    <td align="center" bgcolor="#2B7BC4" style="border-radius: 8px;">
                        <a href="{verification_link}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">Verify Email</a>
                    </td>
                </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #C9DFF0; margin-bottom: 24px;">
            <p style="color: #6BAED6; font-size: 13px; line-height: 20px; margin: 0;">
                If you did not initiate this request, please disregard this email.
            </p>
        </div>
        """
        
        _run_async(
            send_email(
                to_email=email,
                subject="Action Required: Verify your Creo account",
                html_content=html_body,
            )
        )
        logger.info("[Celery] Verification email successfully dispatched to=%s", _mask_email(email))
        
    except Exception as exc:
        logger.error("[Celery] Failed to send verification email to=%s. Retrying...", _mask_email(email))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))