import json
import logging
import smtplib
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from starlette.concurrency import run_in_threadpool
from core.config import settings

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    return f"{local[:3]}***@{domain}"


def _send_smtp_email_sync(to_email: str, subject: str, html_content: str, from_email: Optional[str] = None) -> dict:
    # 1. Primary Strategy: Use Vercel HTTPS email bridge (port 443 HTTPS)
    # This bypasses Render's free tier firewall block on outbound SMTP ports 25, 465, and 587
    bridge_urls = [
        f"{settings.FRONTEND_URL.rstrip('/')}/api/send-email",
        "https://creo-git-main-yogzzz-hubs-projects.vercel.app/api/send-email",
    ]

    for bridge_url in bridge_urls:
        try:
            req_data = json.dumps({
                "to": to_email,
                "subject": subject,
                "html": html_content,
                "secret": "creo-internal-secret-2026",
            }).encode("utf-8")
            req = urllib.request.Request(
                bridge_url,
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Creo-Backend",
                },
            )
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 200:
                    logger.info("Email sent successfully via Vercel HTTPS bridge to=%s", _mask_email(to_email))
                    return {"status": "sent", "to": to_email, "provider": "vercel-https-bridge"}
        except Exception as bridge_err:
            logger.debug("Vercel HTTPS email bridge (%s) skipped: %s", bridge_url, bridge_err)

    # 2. Fallback Strategy: Direct SMTP connection with 3s fast timeout
    sender_email = from_email or settings.SMTP_USERNAME or "creotool26@gmail.com"
    sender_name = settings.SMTP_FROM_NAME or "Creo"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html"))

    smtp_user = settings.SMTP_USERNAME or "creotool26@gmail.com"
    smtp_pass = settings.SMTP_PASSWORD or "gcic myxm rrep lorb"

    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=3) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(sender_email, [to_email], msg.as_string())

    return {"status": "sent", "to": to_email, "provider": "direct-smtp"}


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> dict:
    """Send an email using configured Google SMTP with fallback."""
    logger.info("Sending SMTP email to=%s subject='%s'", _mask_email(to_email), subject)
    try:
        response = await run_in_threadpool(
            _send_smtp_email_sync, to_email, subject, html_content, from_email
        )
        logger.info("SMTP email sent successfully to=%s", _mask_email(to_email))
        return response
    except Exception as exc:
        logger.exception("Unexpected error sending SMTP email to=%s: %s", _mask_email(to_email), exc)
        raise RuntimeError(f"Unexpected error sending email: {exc}") from exc


async def send_otp_email(to_email: str, otp_code: str, name: Optional[str] = None) -> dict:
    """Sends a branded, 6-digit verification code to the recipient via Google SMTP."""
    greeting_name = name.strip() if name and name.strip() else "there"
    subject = f"{otp_code} is your Creo verification code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #0D2137; padding: 28px 32px; text-align: left;">
                  <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Creo</span>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px 32px 24px 32px;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0D2137;">
                    Verify your email address
                  </h2>
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Hi {greeting_name}, welcome to Creo! Use the 6-digit verification code below to complete your sign in:
                  </p>

                  <!-- OTP Code Box -->
                  <div style="background-color: #F0F7FF; border: 2px dashed #2B7BC4; border-radius: 12px; padding: 20px 16px; text-align: center; margin: 28px 0;">
                    <span style="font-family: monospace, Courier, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0D2137; display: inline-block;">
                      {otp_code}
                    </span>
                  </div>

                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                    ⏱️ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                    If you didn't request this verification code, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    &copy; Creo Digital Marketing Platform. All rights reserved.
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

