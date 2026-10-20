"""Asynchronous transactional email delivery via Brevo HTTPS or SMTP."""

from __future__ import annotations

from email.utils import formataddr, parseaddr
from html import escape

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def _send_via_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
    from_email: str = "",
    from_name: str = "Creo",
) -> bool:
    """Send transactional email via SMTP relay (sync wrapped in asyncio.to_thread)."""
    import asyncio
    import smtplib
    import ssl
    from email.message import EmailMessage

    host = (settings.SMTP_SERVER or settings.SMTP_HOST).strip()
    port = int(settings.SMTP_PORT)
    username = settings.SMTP_USERNAME.strip()
    password = settings.SMTP_PASSWORD.strip()
    # Compatibility for installations that previously stored an SMTP key here.
    if not password and settings.BREVO_API_KEY.strip().startswith("xsmtpsib-"):
        password = settings.BREVO_API_KEY.strip()

    sender_name, sender_email = parseaddr(from_email or settings.SMTP_FROM_EMAIL.strip())
    if (
        not host or not username or not password or "@" not in sender_email
        or sender_email.lower().endswith("@smtp-brevo.com")
    ):
        logger.error(
            "smtp_not_configured",
            hint="Set SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and a verified SMTP_FROM_EMAIL",
        )
        return False

    def _sync_smtp_send() -> bool:
        server = None
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = formataddr((sender_name or from_name, sender_email))
            msg["To"] = to_email
            msg.set_content(text_content or "")
            if html_content:
                msg.add_alternative(html_content, subtype="html")

            # Submission ports use STARTTLS, even if an old SSL flag remains.
            use_ssl = port == 465 or (port not in (587, 2525) and settings.SMTP_USE_SSL)
            context = ssl.create_default_context()
            if use_ssl:
                server = smtplib.SMTP_SSL(host, port, timeout=12.0, context=context)
            else:
                server = smtplib.SMTP(host, port, timeout=12.0)
                server.ehlo()
                if port in (587, 2525) or settings.SMTP_USE_TLS:
                    server.starttls(context=context)
                    server.ehlo()
            server.login(username, password)
            refused = server.send_message(msg, from_addr=sender_email, to_addrs=[to_email])
            if refused:
                logger.error("smtp_recipient_refused", host=host)
                return False
            logger.info("smtp_email_accepted", to_email=to_email, host=host)
            return True
        except Exception as exc:
            logger.error(
                "smtp_email_failed", error_type=type(exc).__name__,
                smtp_code=getattr(exc, "smtp_code", None), host=host,
            )
            return False
        finally:
            # A failed QUIT after acceptance must not trigger duplicate delivery.
            if server is not None:
                try:
                    server.quit()
                except Exception:
                    try:
                        server.close()
                    except Exception:
                        pass

    return await asyncio.to_thread(_sync_smtp_send)


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Submit an email to Brevo's transactional API or SMTP relay.

    Returns True on success, False on failure. Never raises — all errors are
    caught, logged, and surfaced as a boolean so callers can decide what to do.
    """
    api_key = (settings.BREVO_API_KEY or "").strip()
    display_name, from_email = parseaddr((settings.BREVO_FROM_EMAIL or "").strip())
    from_name = display_name or settings.BREVO_FROM_NAME.strip() or "Creo"
    clean_to = to_email.strip()

    if not clean_to or "@" not in clean_to or any(c in clean_to + subject for c in "\r\n"):
        logger.error("email_headers_invalid")
        return False

    # If the provided key is an SMTP key (starts with xsmtpsib-), or SMTP_PASSWORD is set without API key, use SMTP relay
    if api_key.startswith("xsmtpsib-") or (not api_key and (settings.SMTP_PASSWORD or "").strip()):
        return await _send_via_smtp(
            clean_to,
            subject,
            html_content,
            text_content,
            from_email=from_email,
            from_name=from_name,
        )

    if not api_key or not from_email:
        # Check if SMTP is configured as fallback
        if (settings.SMTP_PASSWORD or "").strip() or (settings.SMTP_USERNAME or "").strip():
            return await _send_via_smtp(
                clean_to,
                subject,
                html_content,
                text_content,
                from_email=from_email,
                from_name=from_name,
            )
        logger.error(
            "brevo_not_configured",
            hint="Set BREVO_API_KEY and BREVO_FROM_EMAIL to a verified Brevo sender",
        )
        return False

    payload: dict = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": clean_to}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if text_content:
        payload["textContent"] = text_content

    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": api_key,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if 200 <= resp.status_code < 300:
                resp_data = resp.json()
                message_id = resp_data.get("messageId")
                if not message_id:
                    logger.error("brevo_message_id_missing", status=resp.status_code)
                    return False
                logger.info(
                    "brevo_email_accepted",
                    to_email=clean_to,
                    message_id=message_id,
                )
                return True
            else:
                logger.error(
                    "brevo_api_error",
                    status=resp.status_code,
                    # Do not log provider bodies that may echo message content.
                    to_email=clean_to,
                )
                return False

    except Exception as exc:
        logger.error(
            "brevo_api_exception",
            error_type=type(exc).__name__,
            to_email=clean_to,
        )
        return False


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


async def send_payment_verification_request_email(
    to_email: str,
    client_name: str,
    plan_name: str,
    amount: float,
    payment_method: str,
    is_admin: bool = False,
    notes: str = "",
) -> bool:
    """Intimate Admin or Client when an offline payment verification request is submitted."""
    formatted_amount = f"₹{int(amount):,}"
    method_upper = payment_method.upper()

    if is_admin:
        subject = f"[Action Required] Offline Payment Verification: {client_name} ({method_upper})"
        title = "New Offline Payment Verification Request"
        badge_bg = "#FEF3C7"
        badge_color = "#92400E"
        badge_text = "Pending Admin Review"
        action_text = "Review in Admin Portal"
        action_url = "https://creo.yogalakshmibaskar20.workers.dev/admin/finance"
        intro = f"A client has submitted an offline payment verification request ({escape(method_upper)}) for the <strong>{escape(plan_name)}</strong> plan."
        details_html = f"""
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Client Name</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(client_name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Client Email</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(to_email) if not is_admin else ""}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Plan</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(plan_name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Amount</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 700; text-align: right;">{formatted_amount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Payment Method</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(method_upper)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Reference / Note</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 500; text-align: right;">{escape(notes or 'None provided')}</td>
          </tr>
        """
        text_content = (
            f"NEW OFFLINE PAYMENT REQUEST\n\n"
            f"Client: {client_name}\n"
            f"Plan: {plan_name}\n"
            f"Amount: {formatted_amount}\n"
            f"Method: {method_upper}\n"
            f"Note: {notes}\n\n"
            f"Review and approve in Admin Portal: {action_url}"
        )
    else:
        subject = "Payment Verification Request Received — Creo"
        title = "Payment Verification Request Received"
        badge_bg = "#EFF6FF"
        badge_color = "#1E40AF"
        badge_text = "Under Agency Review"
        action_text = "View Onboarding Status"
        action_url = "https://creo.yogalakshmibaskar20.workers.dev/onboarding?step=3"
        intro = f"Hi {escape(client_name)}, we received your offline {escape(method_upper)} payment verification request for the <strong>{escape(plan_name)}</strong> plan ({formatted_amount})."
        details_html = f"""
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Selected Plan</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(plan_name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Amount</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 700; text-align: right;">{formatted_amount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Payment Method</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(method_upper)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">Your Reference Note</td>
            <td style="padding: 10px 0; color: #0D2137; font-size: 13px; font-weight: 500; text-align: right;">{escape(notes or 'None provided')}</td>
          </tr>
        """
        text_content = (
            f"PAYMENT VERIFICATION REQUEST RECEIVED\n\n"
            f"Hi {client_name},\n\n"
            f"We received your offline payment verification request for {plan_name} ({formatted_amount}).\n"
            f"Our agency finance team is reviewing your details. Once verified, your subscription will activate and you can proceed directly to Brand Onboarding (Step 4).\n\n"
            f"Check status: {action_url}"
        )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <tr>
            <td align="center" style="background: #0D2137; padding: 24px; border-bottom: 2px solid #2B7BC4;">
              <div style="font-size: 26px; font-weight: 900; color: #FFFFFF;">CREO<span style="color: #38BDF8;">.</span></div>
              <div style="margin-top: 4px; font-size: 11px; font-weight: 700; color: #7DD3FC; text-transform: uppercase; letter-spacing: 1.5px;">Billing & Payments</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <div style="display: inline-block; background-color: {badge_bg}; color: {badge_color}; border-radius: 12px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
                {badge_text}
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0D2137;">{title}</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">{intro}</p>
              
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  {details_html}
                </table>
              </div>

              <div style="text-align: center; margin-bottom: 20px;">
                <a href="{action_url}" style="display: inline-block; background: #2B7BC4; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  {action_text} &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">&copy; 2026 Creo Creative Studio. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)


async def send_payment_approved_email(
    to_email: str,
    client_name: str,
    plan_name: str,
    amount: float,
    admin_notes: str = "",
) -> bool:
    """Intimate the client via email that their offline payment was verified and approved by admin."""
    formatted_amount = f"₹{int(amount):,}"
    subject = f"🎉 Payment Verified: Your Creo {plan_name} Subscription is Active!"
    action_url = "https://creo.yogalakshmibaskar20.workers.dev/onboarding?step=4"

    text_content = (
        f"PAYMENT VERIFIED & APPROVED!\n\n"
        f"Hi {client_name},\n\n"
        f"Great news! Your offline payment for the {plan_name} plan ({formatted_amount}) has been verified and approved by our agency team.\n\n"
        f"Your subscription is now active! Payment Step 3 has been completed.\n"
        f"You can now proceed directly to Brand Onboarding & Questionnaire (Step 4):\n"
        f"{action_url}\n\n"
        f"{f'Admin note: {admin_notes}' if admin_notes else ''}\n\n"
        f"— Creo Creative Agency\n"
    )

    notes_section = ""
    if admin_notes:
        notes_section = f"""
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #166534;">
          <strong>Admin Note:</strong> {admin_notes}
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <tr>
            <td align="center" style="background: #0D2137; padding: 24px; border-bottom: 2px solid #2B7BC4;">
              <div style="font-size: 26px; font-weight: 900; color: #FFFFFF;">CREO<span style="color: #38BDF8;">.</span></div>
              <div style="margin-top: 4px; font-size: 11px; font-weight: 700; color: #7DD3FC; text-transform: uppercase; letter-spacing: 1.5px;">Payment Approved</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <div style="display: inline-block; background-color: #DCFCE7; color: #166534; border-radius: 12px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
                &#10003; Payment Verified
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0D2137;">You're Ready to Roll!</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>{escape(client_name)}</strong>, your offline payment for the <strong>{escape(plan_name)}</strong> plan ({formatted_amount}) has been verified and approved by the agency admin.
              </p>
              
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 8px 0; color: #64748B; font-size: 13px;">Status</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 13px; font-weight: 700; text-align: right;">ACTIVE (Step 3 Bypassed)</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 8px 0; color: #64748B; font-size: 13px;">Plan</td>
                    <td style="padding: 8px 0; color: #0D2137; font-size: 13px; font-weight: 600; text-align: right;">{escape(plan_name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748B; font-size: 13px;">Amount Paid</td>
                    <td style="padding: 8px 0; color: #0D2137; font-size: 13px; font-weight: 700; text-align: right;">{formatted_amount}</td>
                  </tr>
                </table>
              </div>

              {notes_section}

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="{action_url}" style="display: inline-block; background: #0D2137; color: #38BDF8; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; border: 1px solid #2B7BC4; box-shadow: 0 4px 12px rgba(13, 33, 55, 0.2);">
                  Proceed to Step 4: Brand DNA &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94A3B8; text-align: center;">
                Click above or visit your onboarding portal to fill in your Brand DNA questionnaire.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">&copy; 2026 Creo Creative Studio. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)


async def send_payment_rejected_email(
    to_email: str,
    client_name: str,
    plan_name: str,
    reason: str = "",
) -> bool:
    """Intimate the client via email that their offline payment request was declined."""
    subject = "Update Regarding Your Payment Verification — Creo"
    action_url = "https://creo.yogalakshmibaskar20.workers.dev/onboarding?step=3"

    text_content = (
        f"OFFLINE PAYMENT VERIFICATION UPDATE\n\n"
        f"Hi {client_name},\n\n"
        f"We were unable to verify your offline payment request for the {plan_name} plan.\n\n"
        f"Reason: {reason or 'Payment could not be verified'}\n\n"
        f"Please review your payment information or complete your payment online:\n"
        f"{action_url}\n\n"
        f"— Creo Creative Agency\n"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <tr>
            <td align="center" style="background: #0D2137; padding: 24px; border-bottom: 2px solid #EF4444;">
              <div style="font-size: 26px; font-weight: 900; color: #FFFFFF;">CREO<span style="color: #38BDF8;">.</span></div>
              <div style="margin-top: 4px; font-size: 11px; font-weight: 700; color: #FCA5A5; text-transform: uppercase; letter-spacing: 1.5px;">Verification Update</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <div style="display: inline-block; background-color: #FEE2E2; color: #991B1B; border-radius: 12px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
                Verification Declined
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0D2137;">Payment Could Not Be Verified</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>{escape(client_name)}</strong>, we were unable to confirm your offline payment details for the <strong>{escape(plan_name)}</strong> plan.
              </p>
              
              <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #9F1239; line-height: 1.5;">
                  <strong>Reason:</strong> {escape(reason or 'Payment record could not be confirmed with agency bank/cash receipts.')}
                </p>
              </div>

              <div style="text-align: center; margin-bottom: 20px;">
                <a href="{action_url}" style="display: inline-block; background: #2B7BC4; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  Review &amp; Retry Payment &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">&copy; 2026 Creo Creative Studio. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)


async def send_credentials_email(
    to_email: str,
    full_name: str,
    role: str,
    password: str,
    login_url: str | None = None,
    account_email: str | None = None,
) -> bool:
    """Send workstation account credentials (email and password) to the user.
    
    If account_email is provided, it is displayed as the login identifier while the
    credentials email is physically delivered to to_email (the separate/dispatch address).
    """
    from html import escape

    clean_to = to_email.strip()
    login_id = (account_email or clean_to).strip()
    is_separate_dispatch = bool(account_email and clean_to.lower() != account_email.strip().lower())

    base_url = (login_url or settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    action_url = f"{base_url}/auth"

    subject = "Your Creo Workstation Credentials - Welcome to Creo"
    formatted_role = role.replace("_", " ").title()

    dispatch_notice_text = f"\n- Dispatch Recipient: {clean_to}\n" if is_separate_dispatch else ""
    text_content = f"""Welcome to Creo, {full_name}!

Your Creo workstation account has been provisioned.

Account Credentials:
- Login Email ID: {login_id}{dispatch_notice_text}
- Password: {password}
- Assigned Role: {formatted_role}
- Login URL: {action_url}

Please log in and update your password in Settings if required.

-- Creo Creative Studio Team
"""

    dispatch_notice_html = f"""
                <div style="margin-top: 6px; font-size: 11px; color: #94A3B8;">
                  Delivered to personal/dispatch contact: <span style="color: #7FA0D6; font-family: monospace;">{escape(clean_to)}</span>
                </div>
""" if is_separate_dispatch else ""

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0B111C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B111C; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #161F2D; border-radius: 20px; overflow: hidden; border: 1px solid #2A3446; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 32px 32px 24px; border-bottom: 1px solid #2A3446; text-align: center;">
              <div style="display: inline-block; background: rgba(127, 160, 214, 0.15); border: 1px solid rgba(127, 160, 214, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 800; color: #7FA0D6; letter-spacing: 0.1em; text-transform: uppercase;">CREO WORKSTATION ACCESS</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">Welcome to Creo!</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #E2E8F0;">
                Hi <strong>{escape(full_name)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Your administrative account credentials have been provisioned for the <strong>{escape(formatted_role)}</strong> role. You can log in immediately to access your active tasks, client deliverables, and team workspace.
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #0B111C; border: 1px solid #2A3446; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                <div style="margin-bottom: 14px;">
                  <span style="display: block; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Login Email ID</span>
                  <span style="display: block; font-size: 14px; font-family: monospace; font-weight: 700; color: #FFFFFF; background: #161F2D; padding: 8px 12px; border-radius: 8px; border: 1px solid #2A3446;">{escape(login_id)}</span>
                  {dispatch_notice_html}
                </div>
                <div style="margin-bottom: 14px;">
                  <span style="display: block; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Password</span>
                  <span style="display: block; font-size: 14px; font-family: monospace; font-weight: 700; color: #FCD34D; background: #161F2D; padding: 8px 12px; border-radius: 8px; border: 1px solid #2A3446;">{escape(password)}</span>
                </div>
                <div>
                  <span style="display: block; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Assigned Track</span>
                  <span style="display: inline-block; font-size: 12px; font-weight: 700; color: #7FA0D6; background: rgba(127,160,214,0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(127,160,214,0.3);">{escape(formatted_role)}</span>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
                  Sign In to Workstation &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B; text-align: center;">
                For security reasons, we recommend updating your password after logging in for the first time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 20px 32px; text-align: center; border-top: 1px solid #2A3446;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">&copy; 2026 Creo Creative Studio. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(to_email, subject, html_content, text_content)


async def send_custom_proposal_email(
    to_email: str,
    client_name: str,
    target_plan: str,
    current_plan: str | None = None,
    standard_rate: float | int | str | None = None,
    proposed_rate: float | int | str | None = None,
    notes: str | None = None,
    portal_url: str | None = None,
) -> bool:
    """Send a custom retainer proposal email to a client or prospective brand."""
    from html import escape

    clean_to = to_email.strip()
    if not clean_to or "@" not in clean_to:
        logger.error("invalid_recipient_email_for_proposal", to_email=to_email)
        return False

    base_url = (portal_url or settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    action_url = f"{base_url}/auth"

    subject = f"Executive Retainer Proposal for {client_name} - Creo Creative Studio"

    # Formatting amounts
    std_val = ""
    std_num = None
    if standard_rate:
        try:
            std_num = int(float(standard_rate))
            std_val = f"₹{std_num:,}"
        except Exception:
            std_val = str(standard_rate)

    prop_val = ""
    prop_num = None
    if proposed_rate:
        try:
            prop_num = int(float(proposed_rate))
            prop_val = f"₹{prop_num:,}"
            if standard_rate:
                try:
                    s_num = int(float(standard_rate))
                    if s_num > prop_num:
                        diff = s_num - prop_num
                        pct = round((diff / s_num) * 100)
                        savings_badge = f"Save ₹{diff:,}/mo ({pct}% Executive Privilege Discount)"
                except Exception:
                    pass
        except Exception:
            prop_val = str(proposed_rate)

    savings_badge = ""
    savings_badge_html = ""
    if std_num and prop_num and std_num > prop_num:
        diff = std_num - prop_num
        pct = round((diff / std_num) * 100)
        savings_badge = f"Save ₹{diff:,}/mo ({pct}% Executive Privilege Discount)"
        savings_badge_html = f"""
        <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 9999px; padding: 4px 12px; margin-top: 8px;">
          <span style="font-size: 11px; font-weight: 800; color: #10B981; letter-spacing: 0.05em; text-transform: uppercase;">
            &#10003; Save &#8377;{diff:,}/mo ({pct}% VIP Discount)
          </span>
        </div>
        """

    notes_clean = (notes or "Dedicated creative delivery pod, agile revision turnarounds, and executive account oversight.").strip()

    text_content = f"""Dear {client_name},

We are pleased to share your tailored Custom Retainer Proposal from Creo Creative Studio.

PROPOSAL BREAKDOWN:
- Client Brand: {client_name}
- Retainer Scope: {target_plan}
{f'- Current Plan: {current_plan}' if current_plan else ''}
{f'- Standard Rate: {std_val}/month' if std_val else ''}
{f'- Proposed Rate: {prop_val}/month' if prop_val else ''}
{f'- Exclusive Privilege: {savings_badge}' if savings_badge else ''}

SCOPE & COMMITMENTS:
{notes_clean}

KEY PARTNERSHIP HIGHLIGHTS:
- Dedicated Pod Lead & high-velocity output
- Guaranteed turnaround SLA & priority queue
- Full commercial IP rights & raw asset storage
- Predictable monthly retainers without surprise overages

To review and activate your custom retainer, visit:
{action_url}

If you would like any adjustments to the deliverables quota or terms, feel free to reply directly to this email.

Warm regards,
The Commercial Team
Creo Creative Studio
"""

    current_plan_row = f"""
                  <tr>
                    <td style="padding: 10px 0; color: #94A3B8; font-size: 13px; border-bottom: 1px solid #2A3446;">Current Plan</td>
                    <td style="padding: 10px 0; color: #F1F5F9; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #2A3446;">{escape(current_plan)}</td>
                  </tr>
    """ if current_plan else ""

    standard_rate_row = f"""
                  <tr>
                    <td style="padding: 10px 0; color: #94A3B8; font-size: 13px; border-bottom: 1px solid #2A3446;">Standard Tier Rate</td>
                    <td style="padding: 10px 0; color: #94A3B8; font-size: 13px; text-decoration: line-through; text-align: right; border-bottom: 1px solid #2A3446;">&#8377;{escape(std_val)}/mo</td>
                  </tr>
    """ if std_val else ""

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0B111C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B111C; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #161F2D; border-radius: 24px; overflow: hidden; border: 1px solid #2A3446; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 36px 32px 28px; border-bottom: 1px solid #2A3446; text-align: center;">
              <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 9999px; padding: 6px 16px; margin-bottom: 14px;">
                <span style="font-size: 11px; font-weight: 800; color: #60A5FA; letter-spacing: 0.12em; text-transform: uppercase;">EXECUTIVE COMMERCIAL PROPOSAL</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">Custom Retainer Proposal</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94A3B8;">Prepared exclusively for <strong>{escape(client_name)}</strong></p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #E2E8F0;">
                Hi <strong>{escape(client_name)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Our creative strategy and commercial team have tailored a bespoke retainer scope designed to accelerate your brand's digital presence, content velocity, and production quality.
              </p>

              <!-- Proposal Pricing Card -->
              <div style="background-color: #0B111C; border: 1px solid #2A3446; border-radius: 18px; padding: 22px; margin-bottom: 24px;">
                <div style="text-align: center; padding-bottom: 18px; border-bottom: 1px solid #2A3446;">
                  <span style="font-size: 11px; font-weight: 700; color: #7FA0D6; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">PROPOSED MONTHLY RETAINER</span>
                  <div style="font-size: 32px; font-weight: 900; color: #10B981; letter-spacing: -0.03em;">
                    &#8377;{escape(prop_val)} <span style="font-size: 14px; font-weight: 600; color: #94A3B8;">/ month</span>
                  </div>
                  {savings_badge_html}
                </div>

                <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
                  <tr>
                    <td style="padding: 10px 0; color: #94A3B8; font-size: 13px; border-bottom: 1px solid #2A3446;">Target Plan &amp; Scope</td>
                    <td style="padding: 10px 0; color: #60A5FA; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #2A3446;">{escape(target_plan)}</td>
                  </tr>
                  {current_plan_row}
                  {standard_rate_row}
                  <tr>
                    <td style="padding: 10px 0; color: #94A3B8; font-size: 13px;">Billing Cycle</td>
                    <td style="padding: 10px 0; color: #F1F5F9; font-size: 13px; font-weight: 600; text-align: right;">Monthly Recurring</td>
                  </tr>
                </table>
              </div>

              <!-- Scope & Commitments -->
              <div style="background-color: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 16px; padding: 18px; margin-bottom: 26px;">
                <span style="display: block; font-size: 11px; font-weight: 800; color: #60A5FA; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
                  SCOPE NOTES &amp; COMMITMENTS
                </span>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #E2E8F0; white-space: pre-wrap;">
                  "{escape(notes_clean)}"
                </p>
              </div>

              <!-- Features checklist -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 6px 0; color: #10B981; font-size: 14px; width: 24px; vertical-align: top;">&#10003;</td>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Dedicated pod lead &amp; streamlined Slack / portal workspace</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #10B981; font-size: 14px; width: 24px; vertical-align: top;">&#10003;</td>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Priority SLA turnarounds with iterative revision guarantees</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #10B981; font-size: 14px; width: 24px; vertical-align: top;">&#10003;</td>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">100% intellectual property ownership &amp; cloud raw asset storage</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 12px; box-shadow: 0 4px 16px rgba(37,99,235,0.4);">
                  Review &amp; Accept Proposal &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B; text-align: center;">
                Need custom scope modifications or have questions? Simply reply to this email to connect with your Creo creative director.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 20px 32px; text-align: center; border-top: 1px solid #2A3446;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">&copy; 2026 Creo Creative Studio. All rights reserved. Confidential commercial proposal.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return await send_email(clean_to, subject, html_content, text_content)



