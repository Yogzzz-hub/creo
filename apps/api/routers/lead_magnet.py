import asyncio
import logging
from sqlalchemy.exc import IntegrityError

# pyrefly: ignore [missing-import]

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import limiter
from models.lead import Lead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/lead-magnet", tags=["lead-magnet"])


class LeadMagnetRequest(BaseModel):
    email: EmailStr


class LeadMagnetResponse(BaseModel):
    status: str
    message: str


async def _dispatch_lead_emails(email: str) -> None:
    """
    Send the lead magnet email directly through Resend.

    Celery is intentionally bypassed for now so that email delivery
    can be tested directly through the Resend integration.
    """
    try:
        from services.email import send_email
        from workers.notification_tasks import _build_lead_magnet_html
        from core.config import settings

        html_body = _build_lead_magnet_html(email)

        sales_email = settings.SALES_EMAIL

        sales_html_body = f"""
        <h2>New Lead Magnet Capture</h2>
        <p>A new lead has been captured from the landing page content calendar download.</p>
        <p><b>Email:</b> {email}</p>
        <p><b>Source:</b> Landing Page — Lead Magnet Banner</p>
        <p><b>Action:</b> Add to CRM pipeline for follow-up.</p>
        <p><a href="https://creo.app/admin/sales">View Sales Pipeline</a></p>
        """

        results = await asyncio.gather(
            send_email(
                to_email=email,
                subject="Your Free 30-Day Content Calendar Template",
                html_content=html_body,
            ),
            send_email(
                to_email=sales_email,
                subject=f"New Lead: {email} downloaded Content Calendar",
                html_content=sales_html_body,
            ),
            return_exceptions=True,
        )

        lead_email_result = results[0]
        sales_email_result = results[1]

        if isinstance(lead_email_result, Exception):
            logger.error(
                "Failed to send lead magnet email to %s: %s",
                email,
                lead_email_result,
            )
        else:
            logger.info(
                "Lead magnet email sent successfully to %s. Resend response: %s",
                email,
                lead_email_result,
            )

        if isinstance(sales_email_result, Exception):
            logger.error(
                "Failed to send sales notification to %s: %s",
                sales_email,
                sales_email_result,
            )
        else:
            logger.info(
                "Sales notification sent successfully to %s. Resend response: %s",
                sales_email,
                sales_email_result,
            )

    except Exception:
        logger.exception(
            "Unexpected error while sending lead magnet emails for %s",
            email,
        )


@router.post(
    "",
    response_model=LeadMagnetResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("3/minute")
async def capture_lead(
    request: Request,
    payload: LeadMagnetRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email

    logger.info("Lead magnet capture: email=%s", email)

    try:
        lead = Lead(email=str(email))
        db.add(lead)
        await db.commit()

        logger.info("Lead captured successfully: email=%s", email)

    except IntegrityError:
        await db.rollback()

        logger.warning(
            "Lead already exists: email=%s",
            email,
        )

    # Send the email directly through Resend.
    # This is intentionally awaited during testing so we can see
    # whether the Resend API actually succeeds or fails.
    await _dispatch_lead_emails(str(email))

    return LeadMagnetResponse(
        status="success",
        message="Check your email for the content calendar template.",
    )

