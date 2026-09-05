import logging
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends
from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_client
from models.escalation import Escalation
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


@router.post("/accept-terms")
async def accept_terms(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(updated_at=datetime.now(timezone.utc))
    )
    await db.commit()

    return {"status": "success", "message": "Terms accepted"}


async def _notify_sales_fallback(user_id: str, client_name: str, plan_name: str):
    """Direct asynchronous email fallback if Celery worker or Redis is offline."""
    try:
        from services.email import send_email
        sales_email = "sales@creo.app"
        html_body = f"""
        <h2>Custom Pricing Request</h2>
        <p>Client <b>{client_name}</b> (ID: {user_id}) requested pricing help during the <b>{plan_name}</b> checkout.</p>
        <p>Please reach out via WhatsApp immediately.</p>
        """
        await send_email(to_email=sales_email, subject=f"Hot Lead: {client_name} Pricing Help", html_content=html_body)
    except Exception as exc:
        logger.warning("Direct sales email notification failed: %s", exc)


class PricingHelpRequest(BaseModel):
    plan_name: Optional[str] = None


@router.post("/pricing-help")
async def pricing_help(
    current_user: Annotated[User, Depends(require_client)],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    payload: Optional[PricingHelpRequest] = Body(None),
):
    plan_name = "Unknown Plan"
    if payload and payload.plan_name:
        plan_name = payload.plan_name
    elif current_user.plan_name:
        plan_name = getattr(current_user.plan_name, "value", str(current_user.plan_name))

    user_id_str = str(current_user.id)
    client_name = current_user.full_name or "Client"

    # Persist an escalation record so sales/admin sees it immediately
    try:
        escalation = Escalation(
            type="pricing_help",
            severity="medium",
            client_id=user_id_str,
            description=f"Client {client_name} requested pricing help during {plan_name} checkout.",
            status="active",
        )
        db.add(escalation)
        await db.commit()
    except Exception as exc:
        logger.warning("Failed to persist pricing help escalation: %s", exc)

    # Dispatch via Celery if available, otherwise dispatch via FastAPI BackgroundTasks
    dispatched = False
    try:
        from workers.notification_tasks import notify_sales_pricing_issue
        notify_sales_pricing_issue.delay(
            user_id_str,
            client_name,
            plan_name,
        )
        dispatched = True
    except Exception as exc:
        logger.warning("Celery broker unavailable for pricing help: %s. Using background task fallback.", exc)

    if not dispatched:
        background_tasks.add_task(_notify_sales_fallback, user_id_str, client_name, plan_name)

    return {"status": "success", "message": "Sales team notified"}