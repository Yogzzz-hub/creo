import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="notify_sales_pricing_issue")
def notify_sales_pricing_issue(user_id: str) -> None:
    logger.info(
        "Sales team notification triggered for user %s — "
        "pricing help requested during onboarding",
        user_id,
    )
    logger.debug(
        "[Celery] Notifying sales team: user %s requested pricing help", user_id
    )
