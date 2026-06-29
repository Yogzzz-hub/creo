import logging

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, EmailStr
from starlette.concurrency import run_in_threadpool

from core.exceptions import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/lead-magnet", tags=["lead-magnet"])


class LeadMagnetRequest(BaseModel):
    email: EmailStr


class LeadMagnetResponse(BaseModel):
    status: str
    message: str


def _dispatch_lead_tasks(email: str) -> None:
    try:
        from workers.notification_tasks import (
            send_lead_magnet_email,
            notify_sales_lead_capture,
        )

        send_lead_magnet_email.delay(email)
        notify_sales_lead_capture.delay(email)
        logger.info("Lead magnet Celery tasks dispatched for %s", email)
    except Exception:
        logger.warning(
            "Celery unavailable, sending lead magnet email synchronously for %s",
            email,
        )
        _send_lead_magnet_sync(email)


def _send_lead_magnet_sync(email: str) -> None:
    from services.email import send_email
    from workers.notification_tasks import _build_lead_magnet_html
    import asyncio

    html_body = _build_lead_magnet_html(email)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            pool.submit(
                asyncio.run,
                send_email(
                    to_email=email,
                    subject="Your Free 30-Day Content Calendar Template",
                    html_content=html_body,
                ),
            ).result(timeout=30)
    else:
        asyncio.run(
            send_email(
                to_email=email,
                subject="Your Free 30-Day Content Calendar Template",
                html_content=html_body,
            )
        )


@router.post("", response_model=LeadMagnetResponse, status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def capture_lead(request: Request, payload: LeadMagnetRequest):
    email = payload.email

    logger.info("Lead magnet capture: email=%s", email)

    await run_in_threadpool(_dispatch_lead_tasks, email)

    return LeadMagnetResponse(
        status="success",
        message="Check your email for the content calendar template.",
    )
