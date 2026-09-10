"""Email service providing asynchronous SMTP delivery with Creo branding and high inbox deliverability."""

from __future__ import annotations

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
import smtplib
from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _send_smtp_sync(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Send an email synchronously over TLS via configured SMTP credentials with RFC-compliant anti-spam headers."""
    if not settings.SMTP_SERVER or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning(
            "smtp_credentials_missing_skipping_email",
            to_email=to_email,
            server=settings.SMTP_SERVER,
        )
        return False

    sender_email = (settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME).strip()
    clean_to = to_email.strip()

    # Primary multipart/alternative container
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    # Use standard formataddr to avoid malformed header penalties
    msg["From"] = formataddr(("Creo", sender_email))
    msg["To"] = clean_to
    msg["Reply-To"] = sender_email
    msg["Date"] = formatdate(localtime=True)
    
    domain = sender_email.split("@")[-1] if "@" in sender_email else "creo.agency"
    msg["Message-ID"] = make_msgid(domain=domain)
    
    # Anti-spam transactional email headers recognized by Google, Microsoft, Yahoo
    msg["Auto-Submitted"] = "auto-generated"
    msg["X-Auto-Response-Suppress"] = "All"
    msg["X-Priority"] = "3"
    msg["MIME-Version"] = "1.0"

    # Always attach clean plain-text first (RFC alternative order requirement: plain text first, then html)
    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    else:
        msg.attach(MIMEText(subject, "plain", "utf-8"))

    # HTML part second
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            # Crucial: First parameter to sendmail MUST be raw email address, NOT 'Name <addr>'
            server.sendmail(sender_email, [clean_to], msg.as_string())
        logger.info("smtp_email_sent_successfully", to_email=clean_to, subject=subject)
        return True
    except Exception as e:
        logger.error("smtp_email_send_failed", to_email=clean_to, error=str(e))
        return False


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Non-blocking email delivery executing SMTP on a worker thread."""
    return await asyncio.to_thread(
        _send_smtp_sync,
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )


async def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Send a Creo-branded 6-digit OTP verification code designed for inbox delivery (zero JS, 100% email-safe)."""
    subject = f"{otp_code} is your Creo verification code"
    text_content = (
        f"CREO WORKSPACE VERIFICATION\n\n"
        f"Your one-time security passcode is: {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not request this verification code, please ignore this message. "
        f"Creo staff will never ask for your password or verification code.\n\n"
        f"— Creo Creative Agency\n"
        f"https://creo.yogalakshmibaskar20.workers.dev"
    )

    # Clean, beautiful, pure-HTML/CSS digit boxes without any Javascript or click events
    digits_html = "".join(
        f'<td style="padding: 0 4px;" align="center">'
        f'<div style="width: 44px; height: 52px; line-height: 52px; background-color: #F8FAFC; border: 2px solid #2B7BC4; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 800; color: #0D2137; text-align: center; user-select: all; -webkit-user-select: all;">'
        f'{d}'
        f'</div>'
        f'</td>'
        for d in otp_code
    )

    html_content = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="background: #0D2137; padding: 28px 24px; border-bottom: 2px solid #2B7BC4;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                CREO<span style="color: #38BDF8;">.</span>
              </div>
              <div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: #7DD3FC; text-transform: uppercase; letter-spacing: 1.5px;">
                Security Verification
              </div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #0D2137; letter-spacing: -0.3px;">
                One-Time Security Passcode
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #64748B;">
                Use the verification code below to securely authenticate your session with Creo.
              </p>

              <!-- Digits Table -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
                <tr>
                  {digits_html}
                </tr>
              </table>

              <!-- Expiry Note -->
              <div style="display: inline-block; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 24px;">
                &#9201; Valid for 10 minutes
              </div>

              <!-- Security Advice -->
              <div style="border-top: 1px solid #F1F5F9; padding-top: 18px; text-align: left;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                  <strong style="color: #64748B;">Security tip:</strong> Never share this passcode with anyone. Creo staff will never call or message asking for your code.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 18px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #94A3B8;">
                &copy; 2026 Creo Creative Studio. All rights reserved.<br />
                Sent securely via Creo Automated Authentication Service.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)
