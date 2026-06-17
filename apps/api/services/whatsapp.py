import logging
from typing import Any, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

MSG91_API_BASE = "https://api.msg91.com/api/v5/whatsapp"


async def send_whatsapp_message(
    phone_number: str,
    template_id: str,
    parameters: dict[str, Any],
    country_code: str = "91",
) -> dict:
    """
    Send a WhatsApp template message via the MSG91 API.

    Args:
        phone_number: The recipient's phone number (without country code).
        template_id: The MSG91-approved WhatsApp template ID.
        parameters: A dict mapping template variable names to their values.
                    e.g., {"name": "John", "order_id": "ORD-123"}
        country_code: The country code prefix (default "91" for India).

    Returns:
        A dict containing the MSG91 API response.

    Raises:
        RuntimeError: If the API call fails or returns a non-200 status.
    """
    full_phone = f"{country_code}{phone_number}"

    auth_key = settings.MSG91_AUTH_KEY
    if not auth_key:
        raise RuntimeError("MSG91_AUTH_KEY is not configured")

    template_vars = [
        {"type": "text", "text": value}
        for value in parameters.values()
    ]

    payload = {
        "integration": "whatsapp",
        "type": "template",
        "sender": settings.MSG91_WHATSAPP_NUMBER or "",
        "recipient": full_phone,
        "template": {
            "name": template_id,
            "language": "en",
            "components": [
                {
                    "type": "body",
                    "parameters": template_vars,
                }
            ],
        },
    }

    headers = {
        "authkey": auth_key,
        "Content-Type": "application/json",
    }

    logger.info(
        "Sending WhatsApp message to=%s template=%s",
        full_phone,
        template_id,
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                MSG91_API_BASE,
                json=payload,
                headers=headers,
            )

            if response.status_code != 200:
                logger.error(
                    "MSG91 API error: status=%d body=%s",
                    response.status_code,
                    response.text,
                )
                raise RuntimeError(
                    f"MSG91 API returned status {response.status_code}: "
                    f"{response.text}"
                )

            result = response.json()
            logger.info(
                "WhatsApp message sent to=%s response=%s",
                full_phone,
                result,
            )
            return result

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP error sending WhatsApp message to=%s: %s",
                full_phone,
                exc,
            )
            raise RuntimeError(
                f"HTTP error sending WhatsApp message to {full_phone}: {exc}"
            ) from exc

        except httpx.RequestError as exc:
            logger.error(
                "Request error sending WhatsApp message to=%s: %s",
                full_phone,
                exc,
            )
            raise RuntimeError(
                f"Network error sending WhatsApp message to {full_phone}: {exc}"
            ) from exc


async def send_otp_sms(
    phone_number: str,
    otp: str,
    country_code: str = "91",
) -> dict:
    """
    Send an OTP SMS via MSG91 using the standard SMS API.

    Args:
        phone_number: The recipient's phone number (without country code).
        otp: The OTP code to send.
        country_code: The country code prefix (default "91" for India).

    Returns:
        A dict containing the MSG91 API response.

    Raises:
        RuntimeError: If the API call fails.
    """
    full_phone = f"{country_code}{phone_number}"
    auth_key = settings.MSG91_AUTH_KEY
    sender_id = settings.MSG91_SENDER_ID

    if not auth_key:
        raise RuntimeError("MSG91_AUTH_KEY is not configured")

    url = f"https://api.msg91.com/api/v5/otp"
    payload = {
        "mobile": full_phone,
        "otp": otp,
        "otp_length": 6,
        "otp_expiry": 5,
        "sender_id": sender_id or "CREOAV",
        "authkey": auth_key,
    }

    logger.info("Sending OTP SMS to=%s", full_phone)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)

            if response.status_code != 200:
                logger.error(
                    "MSG91 OTP SMS error: status=%d body=%s",
                    response.status_code,
                    response.text,
                )
                raise RuntimeError(
                    f"MSG91 OTP SMS returned status {response.status_code}: "
                    f"{response.text}"
                )

            result = response.json()
            logger.info("OTP SMS sent to=%s", full_phone)
            return result

        except httpx.HTTPStatusError as exc:
            logger.error("HTTP error sending OTP to=%s: %s", full_phone, exc)
            raise RuntimeError(
                f"HTTP error sending OTP to {full_phone}: {exc}"
            ) from exc

        except httpx.RequestError as exc:
            logger.error("Network error sending OTP to=%s: %s", full_phone, exc)
            raise RuntimeError(
                f"Network error sending OTP to {full_phone}: {exc}"
            ) from exc
