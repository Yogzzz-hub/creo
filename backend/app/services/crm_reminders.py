"""Durable one-time CRM overdue notifications, safe across API replicas."""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select, text
from app.db.session import async_session_factory, tenant_session
from app.models.ops import Notification
from app.models.revenue_crm import CRMTask
from app.models.user import StaffProfile


async def remind_overdue():
    async with async_session_factory() as db:
        agency_ids = list(
            (
                await db.execute(text("SELECT id FROM agencies WHERE status IN ('active','trial')"))
            ).scalars()
        )
    count = 0
    for agency_id in agency_ids:
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id):
                tasks = list(
                    (
                        await db.execute(
                            select(CRMTask)
                            .where(
                                CRMTask.agency_id == agency_id,
                                CRMTask.status == "pending",
                                CRMTask.due_at <= datetime.now(UTC),
                                CRMTask.alerted_at.is_(None),
                            )
                            .with_for_update(skip_locked=True)
                            .limit(100)
                        )
                    ).scalars()
                )
                for task in tasks:
                    recipients = {task.owner_id}
                    profile = await db.get(StaffProfile, task.owner_id)
                    if profile and profile.team_lead_id:
                        recipients.add(profile.team_lead_id)
                    for recipient in recipients:
                        db.add(
                            Notification(
                                agency_id=agency_id,
                                user_id=recipient,
                                title="CRM follow-up is due",
                                message=task.title,
                                    link="/bde/crm/tasks",
                            )
                        )
                    task.alerted_at = datetime.now(UTC)
                    count += 1
                await db.commit()
    return count


async def reminder_loop():
    while True:
        try:
            await remind_overdue()
            from app.services.crm_whatsapp import dispatch_messages

            await dispatch_messages()
        except Exception:
            logging.getLogger(__name__).warning("CRM reminder sweep failed; retrying next minute")
        await asyncio.sleep(60)
