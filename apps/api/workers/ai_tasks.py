import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="generate_ai_analysis")
def generate_ai_analysis(user_id: str) -> None:
    logger.info(
        "AI analysis task triggered for user %s — "
        "GPT-4o brand analysis will be implemented in Phase 9",
        user_id,
    )
    print(f"[Celery] Generating AI analysis for user {user_id}")
