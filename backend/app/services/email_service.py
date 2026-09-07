"""Email service providing asynchronous SMTP delivery with Creo branding."""

from __future__ import annotations

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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
    """Send an email synchronously over TLS via configured SMTP credentials."""
    if not settings.SMTP_SERVER or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning(
            "smtp_credentials_missing_skipping_email",
            to_email=to_email,
            server=settings.SMTP_SERVER,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Creo <{settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME}>"
    msg["To"] = to_email

    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        logger.info("smtp_email_sent_successfully", to_email=to_email, subject=subject)
        return True
    except Exception as e:
        logger.error("smtp_email_send_failed", to_email=to_email, error=str(e))
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
    """Send a Creo-branded 6-digit OTP verification code."""
    subject = f"Your Creo Verification Code: {otp_code}"
    text_content = f"Your verification code for Creo is: {otp_code}. This code expires in 10 minutes."

    # Format digits into clean individual spans for guaranteed alignment
    digits_html = "".join(
        f'<td style="padding: 0 4px;"><div style="width: 38px; height: 48px; line-height: 48px; background: #1a2333; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 26px; font-weight: 800; color: #60a5fa; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">{d}</div></td>'
        for d in str(otp_code)
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0B1120;
      color: #F8FAFC;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #0B1120;
      padding: 30px 15px;
    }}
    .container {{
      max-width: 500px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }}
    .header {{
      background: linear-gradient(135deg, #0D2137 0%, #1A4676 100%);
      padding: 28px 32px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }}
    .logo {{
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #FFFFFF;
      text-decoration: none;
      display: inline-block;
    }}
    .logo span {{
      color: #38BDF8;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 12px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 12px;
    }}
    .content {{
      padding: 36px 28px;
      text-align: center;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 10px 0;
      letter-spacing: -0.01em;
    }}
    .subtitle {{
      font-size: 14px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0 0 26px 0;
    }}
    .otp-table {{
      margin: 0 auto 26px auto;
      border-collapse: separate;
      border-spacing: 0;
    }}
    .timer-note {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      color: #38BDF8;
      font-weight: 600;
      margin-bottom: 24px;
    }}
    .warning {{
      font-size: 12px;
      line-height: 1.5;
      color: #64748B;
      margin: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 20px;
    }}
    .footer {{
      padding: 20px 24px;
      background: #090E17;
      text-align: center;
      font-size: 11px;
      color: #475569;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://creo-ev42.onrender.com" class="logo">CREO<span>.</span></a>
        <br>
        <span class="badge">Security Verification</span>
      </div>
      <div class="content">
        <h1>One-Time Security Passcode</h1>
        <p class="subtitle">Use the verification code below to securely sign in to your Creo client workspace.</p>
        
        <table class="otp-table" role="presentation">
          <tr>
            {digits_html}
          </tr>
        </table>

        <div class="timer-note">
          &#9201; Code expires in 10 minutes
        </div>

        <p class="warning">
          Never share this code with anyone. Creo staff will never ask for your verification passcode.
        </p>
      </div>
      <div class="footer">
        &copy; 2026 Creo Creative Studio. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)
