"""Official Meta templates only; durable claim and no retry after ambiguous submission."""

import hashlib
import hmac
import re
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import func, select

from app.config import settings
from app.core.errors import Conflict
from app.db.session import async_session_factory, tenant_session
from app.models.crm import Lead
from app.models.revenue_crm import CRMConsent, CRMMessage
from app.services.revenue_crm import CLOSED, policy


def connection(agency_id):
    config = settings.CRM_WHATSAPP_CONNECTIONS.get(str(agency_id), {})
    return (
        config
        if all(
            config.get(k)
            for k in [
                "token",
                "phone_number_id",
                "business_account_id",
                "app_secret",
                "verify_token",
            ]
        )
        else None
    )


def valid_signature(body: bytes, signature: str, secret: str):
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def templates(agency_id):
    config = connection(agency_id)
    if not config:
        raise Conflict(
            "Official WhatsApp Business is not configured for this agency.",
            code="WHATSAPP_NOT_CONFIGURED",
        )
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/{config['business_account_id']}/message_templates",
                headers={"Authorization": f"Bearer {config['token']}"},
                params={"fields": "name,status,language,components", "limit": 100},
            )
        if not response.is_success:
            raise Conflict(
                "Meta could not verify message templates. Check the agency's WhatsApp credentials.",
                code="WHATSAPP_PROVIDER_ERROR",
            )
        data = response.json().get("data")
        if not isinstance(data, list):
            raise ValueError("Invalid provider template response")
        return [t for t in data if isinstance(t, dict) and t.get("status") == "APPROVED"]
    except (httpx.HTTPError, ValueError) as exc:
        raise Conflict(
            "Meta templates are temporarily unavailable. Please try again.",
            code="WHATSAPP_PROVIDER_ERROR",
        ) from exc


async def eligible(db, lead, message, config, now=None):
    now = now or datetime.now(UTC)
    if not config:
        return "Official WhatsApp Business is not connected."
    if lead.status in CLOSED or not lead.assigned_bde_id:
        return "The lead is closed or has no owner."
    if not re.fullmatch(r"\+[1-9]\d{7,14}", lead.phone or ""):
        return "A valid international phone number is required."
    permission = await db.scalar(
        select(CRMConsent)
        .where(CRMConsent.lead_id == lead.id, CRMConsent.agency_id == lead.agency_id)
        .order_by(CRMConsent.created_at.desc(), CRMConsent.id.desc())
        .limit(1)
    )
    if not permission or permission.status != "opted_in":
        return "Explicit WhatsApp permission is missing or the contact opted out."
    latest_inbound = await db.scalar(
        select(CRMMessage.created_at)
        .where(CRMMessage.lead_id == lead.id, CRMMessage.direction == "inbound")
        .order_by(CRMMessage.created_at.desc())
        .limit(1)
    )
    enrolled = (message.metadata_extra or {}).get("enrolled_at")
    if latest_inbound and enrolled and latest_inbound >= datetime.fromisoformat(enrolled):
        return "The contact replied after this follow-up was scheduled. Review the conversation."
    rules, _ = await policy(db, lead.agency_id)
    hour = now.astimezone(ZoneInfo(rules["timezone"])).hour
    if hour >= rules["quiet_start"] or hour < rules["quiet_end"]:
        return "Agency quiet hours are active. Reschedule within working hours."
    count = await db.scalar(
        select(func.count())
        .select_from(CRMMessage)
        .where(
            CRMMessage.lead_id == lead.id,
            CRMMessage.direction == "outbound",
            CRMMessage.status.in_(["submitting", "sent", "delivered", "read", "uncertain"]),
            CRMMessage.updated_at >= now - timedelta(days=1),
            CRMMessage.id != message.id,
        )
    )
    if count >= rules["max_messages_per_day"]:
        return "The agency message frequency limit is reached."
    return None


async def execute_message(message_id, agency_id):
    config = connection(agency_id)
    async with async_session_factory() as db:
        async with tenant_session(db, agency_id):
            initial = await db.get(CRMMessage, message_id)
            if not initial or initial.agency_id != agency_id:
                return
            lead = await db.scalar(
                select(Lead)
                .where(Lead.id == initial.lead_id, Lead.agency_id == agency_id)
                .with_for_update()
            )
            message = await db.scalar(
                select(CRMMessage)
                .where(CRMMessage.id == message_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            if (
                message.status != "scheduled"
                or not message.scheduled_at
                or message.scheduled_at > datetime.now(UTC)
            ):
                return
            error = await eligible(db, lead, message, config)
            if error:
                message.status, message.error = "suppressed", error
                await db.commit()
                return
            metadata = message.metadata_extra
            try:
                approved = await templates(agency_id)
                template = next(
                    (
                        t
                        for t in approved
                        if t["name"] == metadata["template"]
                        and t["language"] == metadata["language"]
                    ),
                    None,
                )
                if not template:
                    raise Conflict("The selected template is no longer approved by Meta.")
                if template.get("components") != metadata.get("approved_template_snapshot", {}).get(
                    "components"
                ):
                    raise Conflict(
                        "Meta changed this template. Review the draft and schedule it again."
                    )
            except Conflict as exc:
                message.status, message.error = "failed", str(exc)
                await db.commit()
                return
            # Commit intent first. Recovery never resends submitting/uncertain rows.
            message.status = "submitting"
            await db.commit()
            lead = await db.scalar(
                select(Lead)
                .where(Lead.id == lead.id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            await db.refresh(message)
            if message.status != "submitting":
                return
            error = await eligible(db, lead, message, config)
            if error:
                message.status, message.error = "suppressed", error
                await db.commit()
                return
            payload = {
                "messaging_product": "whatsapp",
                "to": lead.phone.lstrip("+"),
                "type": "template",
                "template": {
                    "name": metadata["template"],
                    "language": {"code": metadata["language"]},
                },
            }
            if metadata.get("variables"):
                payload["template"]["components"] = [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": value} for value in metadata["variables"]
                        ],
                    }
                ]
            try:
                async with httpx.AsyncClient(timeout=25) as client:
                    response = await client.post(
                        f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/{config['phone_number_id']}/messages",
                        json=payload,
                        headers={"Authorization": f"Bearer {config['token']}"},
                    )
                if response.is_success:
                    message.provider_id = response.json()["messages"][0]["id"]
                    message.status, message.error = "sent", None
                elif response.status_code >= 500:
                    message.status, message.error = (
                        "uncertain",
                        "Meta returned a server error. Check provider history before retrying.",
                    )
                else:
                    message.status, message.error = (
                        "failed",
                        "Meta rejected this template message. Check the template, destination and account configuration.",
                    )
            except Exception:
                message.status, message.error = (
                    "uncertain",
                    "The provider result is uncertain. Automatic resend is blocked to prevent duplicates.",
                )
            await db.commit()


async def dispatch_messages():
    for agency_key in settings.CRM_WHATSAPP_CONNECTIONS:
        agency_id = uuid.UUID(agency_key)
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id):
                ids = list(
                    (
                        await db.execute(
                            select(CRMMessage.id)
                            .where(
                                CRMMessage.agency_id == agency_id,
                                CRMMessage.status == "scheduled",
                                CRMMessage.scheduled_at <= datetime.now(UTC),
                            )
                            .order_by(CRMMessage.scheduled_at)
                            .limit(50)
                        )
                    ).scalars()
                )
        for message_id in ids:
            await execute_message(message_id, agency_id)
