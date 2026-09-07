"""Notification worker tasks for Email (Resend), WhatsApp, and In-App alerts.

Records all outbound notifications in the notifications table with sent_at or failed_reason.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select

from app.config import settings
from app.db.session import async_session_factory
from app.models.ops import Notification
from app.models.user import User


def run_async_safe(coro: Any) -> Any:
    """Run an async coroutine safely from sync Celery worker threads."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


async def send_notification_async(
    user_id: uuid.UUID,
    title: str,
    message: str,
    *,
    channel: str = "in_app",  # "in_app", "email", "whatsapp"
    link: str | None = None,
    recipient_email: str | None = None,
    recipient_phone: str | None = None,
) -> dict[str, Any]:
    """Deliver a notification across specified channel and persist audit record in DB."""
    async with async_session_factory() as db:
        # 1. Resolve user email/phone if omitted
        if not recipient_email or not recipient_phone:
            user_stmt = select(User).where(User.id == user_id)
            user_res = await db.execute(user_stmt)
            user = user_res.scalar_one_or_none()
            if user:
                recipient_email = recipient_email or user.email

        sent_at: datetime | None = None
        failed_reason: str | None = None

        # 2. Channel dispatch
        if channel == "email":
            if not settings.RESEND_API_KEY:
                # Mock delivery in dev/test
                sent_at = datetime.now(UTC)
            else:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(
                            "https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                            json={
                                "from": "Creo Notifications <noreply@creo.network>",
                                "to": [recipient_email or "client@example.com"],
                                "subject": title,
                                "text": message,
                            },
                        )
                        if resp.status_code >= 400:
                            failed_reason = f"Resend API error: {resp.text}"
                        else:
                            sent_at = datetime.now(UTC)
                except Exception as e:
                    failed_reason = f"Email delivery exception: {e!s}"

        elif channel == "whatsapp":
            if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
                # Mock delivery in dev/test
                sent_at = datetime.now(UTC)
            else:
                try:
                    url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(
                            url,
                            headers={"Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}"},
                            json={
                                "messaging_product": "whatsapp",
                                "to": recipient_phone or "+919999999999",
                                "type": "text",
                                "text": {"body": f"{title}\n\n{message}"},
                            },
                        )
                        if resp.status_code >= 400:
                            failed_reason = f"WhatsApp Cloud API error: {resp.text}"
                        else:
                            sent_at = datetime.now(UTC)
                except Exception as e:
                    failed_reason = f"WhatsApp delivery exception: {e!s}"

        else:
            # In-App notification
            sent_at = datetime.now(UTC)

        # 3. Insert notification row
        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            is_read=False,
            sent_at=sent_at,
            failed_reason=failed_reason,
            created_at=datetime.now(UTC),
        )
        db.add(notif)
        await db.commit()

        return {
            "notification_id": str(notif.id),
            "sent_at": notif.sent_at.isoformat() if notif.sent_at else None,
            "failed_reason": notif.failed_reason,
        }


def send_notification_task(
    user_id_str: str,
    title: str,
    message: str,
    channel: str = "in_app",
    link: str | None = None,
    recipient_email: str | None = None,
    recipient_phone: str | None = None,
) -> dict[str, Any]:
    """Celery task entrypoint."""
    uid = uuid.UUID(user_id_str)
    return run_async_safe(  # type: ignore[no-any-return]
        send_notification_async(
            user_id=uid,
            title=title,
            message=message,
            channel=channel,
            link=link,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
        )
    )
