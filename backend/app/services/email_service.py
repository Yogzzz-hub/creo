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

    # Format digits into clean individual spans for guaranteed alignment (Light mode)
    digits_html = "".join(
        f'<td style="padding: 0 4px;"><div style="width: 42px; height: 52px; line-height: 52px; background: #F8FAFC; border: 2px solid #2B7BC4; border-radius: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 800; color: #0D2137; text-align: center; box-shadow: 0 2px 8px rgba(43, 123, 196, 0.12);">{d}</div></td>'
        for d in otp_code
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
      background-color: #F1F5F9;
      color: #0D2137;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #F1F5F9;
      padding: 36px 15px;
    }}
    .container {{
      max-width: 500px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }}
    .header {{
      background: linear-gradient(135deg, #0D2137 0%, #173E67 100%);
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
      padding: 5px 14px;
      background: rgba(56, 189, 248, 0.16);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #7DD3FC;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 12px;
    }}
    .content {{
      padding: 36px 28px 28px 28px;
      text-align: center;
      background: #FFFFFF;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #0D2137;
      margin: 0 0 10px 0;
      letter-spacing: -0.01em;
    }}
    .subtitle {{
      font-size: 14px;
      line-height: 1.6;
      color: #64748B;
      margin: 0 0 26px 0;
    }}
    .otp-table {{
      margin: 0 auto 16px auto;
      border-collapse: separate;
      border-spacing: 0;
      cursor: pointer;
    }}
    .copy-btn-container {{
      margin: 0 auto 24px auto;
      text-align: center;
    }}
    .copy-btn {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #F0F7FD;
      border: 1.5px solid #2B7BC4;
      border-radius: 10px;
      padding: 9px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #2B7BC4;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 2px 6px rgba(43, 123, 196, 0.12);
      transition: all 0.2s ease;
      user-select: none;
      -webkit-user-select: none;
    }}
    .copy-btn:hover {{
      background: #E0EFFD;
      border-color: #1a6cb5;
      color: #1a6cb5;
    }}
    .timer-note {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 7px 16px;
      border-radius: 20px;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 24px;
    }}
    .warning {{
      font-size: 12px;
      line-height: 1.5;
      color: #64748B;
      margin: 0;
      border-top: 1px solid #F1F5F9;
      padding-top: 20px;
    }}
    .footer {{
      padding: 20px 24px;
      background: #F8FAFC;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
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
        
        <table class="otp-table" role="presentation" onclick="copyCode()" title="Click to copy passcode">
          <tr>
            {digits_html}
          </tr>
        </table>

        <!-- Single Copy Passcode Button with Copy Icon (No Duplicate Digits) -->
        <div class="copy-btn-container">
          <button type="button" class="copy-btn" onclick="copyCode()" title="Copy passcode to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B7BC4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="copy-btn-label">Copy to clipboard</span>
          </button>
        </div>

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

  <script>
    function copyCode() {{
      var code = "{otp_code}";
      function showSuccess() {{
        var label = document.getElementById("copy-btn-label");
        if (label) {{
          label.textContent = "✓ Copied to clipboard!";
          setTimeout(function() {{ label.textContent = "Copy to clipboard"; }}, 2500);
        }}
      }}
      if (navigator.clipboard && navigator.clipboard.writeText) {{
        navigator.clipboard.writeText(code).then(showSuccess).catch(function() {{
          fallbackCopy(code, showSuccess);
        }});
      }} else {{
        fallbackCopy(code, showSuccess);
      }}
    }}
    function fallbackCopy(code, cb) {{
      var textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {{
        document.execCommand("copy");
        if (cb) cb();
      }} catch (e) {{}}
      document.body.removeChild(textarea);
    }}
  </script>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)
