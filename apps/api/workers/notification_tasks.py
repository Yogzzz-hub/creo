#send_verification_email_task
import asyncio
import logging

from celery import shared_task

from services.email import send_email

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    return f"{local[:3]}***@{domain}"


def _run_async(coroutine):
    return asyncio.run(coroutine)


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