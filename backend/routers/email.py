import logging

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, EmailStr

from core.exceptions import limiter
from services.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/email", tags=["email"])


class SendTemplateRequest(BaseModel):
    to_email: EmailStr
    subject: str


class SendTemplateResponse(BaseModel):
    status: str
    message: str


async def send_template(to_email: str, subject: str) -> dict:
    """Send a template email with a dynamic image and call-to-action button."""

    template_image_url = "https://rndrwcgjmbnhixkurara.supabase.co/storage/v1/object/public/Template/Template%20plan.jpeg"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #2B7BC4; padding: 24px 32px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">{subject}</h1>
                            </td>
                        </tr>

                        <!-- Image -->
                        <tr>
                            <td style="padding: 32px 32px 0;">
                                <img
                                    src="https://rndrwcgjmbnhixkurara.supabase.co/storage/v1/object/public/Template/Template%20plan.jpeg"
                                    alt="Template Preview"
                                    style="width: 100%; height: auto; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: block;"
                                />
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 28px 32px 0; text-align: center;">
                                <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">
                                    Here is your requested template. Click the button below to access it instantly.
                                </p>
                            </td>
                        </tr>

                        <!-- CTA Button -->
                        <tr>
                            <td style="padding: 24px 32px 32px; text-align: center;">
                                <a
                                    href="{template_image_url}"
                                    target="_blank"
                                    style="
                                        display: inline-block;
                                        background-color: #2B7BC4;
                                        color: #ffffff;
                                        text-decoration: none;
                                        font-size: 16px;
                                        font-weight: 600;
                                        padding: 14px 36px;
                                        border-radius: 6px;
                                        transition: background-color 0.2s;
                                    "
                                >Access Template</a>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                    &copy; 2026 Creo. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return await send_email(to_email=to_email, subject=subject, html_content=html_content)


@router.post("/send-template", response_model=SendTemplateResponse, status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def send_template_endpoint(request: Request, payload: SendTemplateRequest):
    """Endpoint to send a template email with a dynamic image and CTA button."""

    logger.info("Sending template email to=%s subject='%s'", payload.to_email, payload.subject)

    await send_template(to_email=payload.to_email, subject=payload.subject)


    return SendTemplateResponse(
        status="success",
        message=f"Template email sent to {payload.to_email}.",
    )
