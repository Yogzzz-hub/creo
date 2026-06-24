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


@shared_task(name="notify_ai_analysis_complete", bind=True, max_retries=3)
def notify_ai_analysis_complete(
    self, user_id: str, client_email: str, client_name: str, summary_line: str
) -> None:
    """Notify client and internal team when AI brand analysis completes."""
    logger.info(f"[Celery] Sending AI analysis completion notification to {client_email}")

    # 1. Email the client with their brand summary
    html_body = f"""
    <h2>Your Brand Analysis is Ready</h2>
    <p>Hi {client_name},</p>
    <p>Our AI has finished analyzing your brand questionnaire. Here's your brand summary:</p>
    <blockquote style="border-left: 3px solid #2B7BC4; padding-left: 12px; margin: 16px 0; color: #333;">
        {summary_line}
    </blockquote>
    <p>Your dedicated team is now preparing your content calendar. You'll receive your first deliverables within 3-5 business days.</p>
    <p>You can view your full analysis in the <a href="https://creo.app/portal">client portal</a>.</p>
    <br>
    <p>— The Creo Team</p>
    """
    try:
        _run_async(
            send_email(
                to_email=client_email,
                subject="Your Brand Analysis is Ready — Creo",
                html_content=html_body,
            )
        )
    except Exception as exc:
        logger.error(f"Failed to send AI analysis email to {client_email}: {exc}")
        raise self.retry(exc=exc, countdown=60)

    # 2. Log internal team notification (Slack/ops channel placeholder)
    logger.info(
        f"[INTERNAL] AI analysis complete for client {client_name} (ID: {user_id}). "
        f"Summary: {summary_line}"
    )


def _count_business_days(start: date, end: date) -> int:
    """Count business days (Mon-Fri) between two dates."""
    if end <= start:
        return 0
    business_days = 0
    current = start
    while current < end:
        if current.weekday() < 5:
            business_days += 1
        current += timedelta(days=1)
    return business_days


@shared_task(name="check_content_plan_delivery_sla")
def check_content_plan_delivery_sla() -> None:
    """Daily SLA check: flag ContentPlans not delivered within 3 business days of creation."""
    from datetime import date, datetime, timedelta, timezone

    from core.database import async_session
    from models.content_plan import ContentPlan
    from models.enums import ContentPlanStatus
    from models.escalation import Escalation
    from models.user import User
    from sqlalchemy import select

    async def _check():
        now = datetime.now(timezone.utc)
        today = now.date()

        async with async_session() as db:
            result = await db.execute(
                select(ContentPlan, User)
                .join(User, User.id == ContentPlan.client_id)
                .where(
                    ContentPlan.status.in_([
                        ContentPlanStatus.draft,
                        ContentPlanStatus.submitted,
                    ]),
                )
            )
            plans = result.all()

            escalations_created = 0
            for plan, user in plans:
                created_date = plan.created_at.date() if plan.created_at else None
                if not created_date:
                    continue

                bdays_elapsed = _count_business_days(created_date, today)

                if bdays_elapsed <= 3:
                    continue

                existing_esc = await db.execute(
                    select(Escalation).where(
                        Escalation.client_id == user.id,
                        Escalation.type == "content_plan_delivery_sla",
                        Escalation.status != "resolved",
                    )
                )
                if existing_esc.scalar_one_or_none() is not None:
                    continue

                escalation = Escalation(
                    type="content_plan_delivery_sla",
                    severity="high",
                    client_id=user.id,
                    description=(
                        f"Content plan for {user.business_name or user.full_name} "
                        f"not delivered within 3 business days of onboarding "
                        f"({bdays_elapsed} business days elapsed)."
                    ),
                    status="open",
                )
                db.add(escalation)
                escalations_created += 1

                admin_email = "admin@creo.app"
                html_body = f"""
                <h2>SLA Breach: Content Plan Delivery</h2>
                <p>Client <b>{user.business_name or user.full_name}</b> (ID: {user.id}) has not received
                their content plan within the 3-business-day SLA.</p>
                <p><b>{bdays_elapsed} business days</b> have elapsed since onboarding.</p>
                <p>Please deliver the content plan immediately.</p>
                """
                try:
                    _run_async(send_email(
                        to_email=admin_email,
                        subject=f"SLA Breach: Content Plan Delay — {user.business_name or user.full_name}",
                        html_content=html_body,
                    ))
                except Exception as exc:
                    logger.error(f"Failed to send SLA breach email: {exc}")

            await db.commit()
            logger.info(
                "check_content_plan_delivery_sla completed — %d escalation(s) created",
                escalations_created,
            )
            return escalations_created

    _run_async(_check())


@shared_task(name="check_content_plan_approval_escalation")
def check_content_plan_approval_escalation() -> None:
    """Daily check: escalate ContentPlans in 'submitted' status for >5 business days."""
    from datetime import date, datetime, timedelta, timezone

    from core.database import async_session
    from models.content_plan import ContentPlan
    from models.enums import ContentPlanStatus
    from models.escalation import Escalation
    from models.user import User
    from sqlalchemy import select

    async def _check():
        now = datetime.now(timezone.utc)
        today = now.date()

        async with async_session() as db:
            result = await db.execute(
                select(ContentPlan, User)
                .join(User, User.id == ContentPlan.client_id)
                .where(ContentPlan.status == ContentPlanStatus.submitted)
            )
            plans = result.all()

            escalations_created = 0
            for plan, user in plans:
                submitted_date = plan.submitted_at.date() if plan.submitted_at else None
                if not submitted_date:
                    continue

                bdays_elapsed = _count_business_days(submitted_date, today)

                if bdays_elapsed <= 5:
                    continue

                existing_esc = await db.execute(
                    select(Escalation).where(
                        Escalation.client_id == user.id,
                        Escalation.type == "content_plan_approval_escalation",
                        Escalation.status != "resolved",
                    )
                )
                if existing_esc.scalar_one_or_none() is not None:
                    continue

                escalation = Escalation(
                    type="content_plan_approval_escalation",
                    severity="medium",
                    client_id=user.id,
                    description=(
                        f"Content plan for {user.business_name or user.full_name} "
                        f"has been in 'submitted' status for {bdays_elapsed} business days "
                        f"without approval (SLA: 5 business days)."
                    ),
                    status="open",
                )
                db.add(escalation)
                escalations_created += 1

                admin_email = "admin@creo.app"
                html_body = f"""
                <h2>Escalation: Content Plan Approval Delay</h2>
                <p>Content plan for client <b>{user.business_name or user.full_name}</b> (ID: {user.id})
                has been awaiting approval for <b>{bdays_elapsed} business days</b>.</p>
                <p>Please review and approve/reject the content plan.</p>
                """
                try:
                    _run_async(send_email(
                        to_email=admin_email,
                        subject=f"Escalation: Content Plan Approval Delay — {user.business_name or user.full_name}",
                        html_content=html_body,
                    ))
                except Exception as exc:
                    logger.error(f"Failed to send escalation email: {exc}")

            await db.commit()
            logger.info(
                "check_content_plan_approval_escalation completed — %d escalation(s) created",
                escalations_created,
            )
            return escalations_created

    _run_async(_check())