import logging
from typing import Optional

import resend

from core.config import settings

logger = logging.getLogger(__name__)

FROM_EMAIL = settings.RESEND_FROM_EMAIL or "notifications@creo.app"

resend.api_key = settings.RESEND_API_KEY


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> dict:
    """
    Send an email using the Resend API.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        html_content: HTML body of the email.
        from_email: Optional override for the sender address.

    Returns:
        A dict containing the Resend API response (e.g., {"id": "..."}).

    Raises:
        RuntimeError: If the Resend API call fails.
    """
    sender = from_email or FROM_EMAIL

    logger.info("Sending email to=%s subject='%s' from='%s'", to_email, subject, sender)

    try:
        response = resend.Emails.send(
            {
                "from": sender,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
        )

        logger.info(
            "Email sent successfully to=%s message_id=%s",
            to_email,
            response.get("id", "unknown"),
        )
        return response

    except Exception as exc:
        logger.exception("Unexpected error sending email to=%s", to_email)
        raise RuntimeError(
            f"Unexpected error sending email to {to_email}: {exc}"
        ) from exc