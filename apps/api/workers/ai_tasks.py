import asyncio
import logging

from celery import shared_task
from sqlalchemy import select

from core.database import async_session
from models.questionnaire import Questionnaire

logger = logging.getLogger(__name__)


async def _update_questionnaire_summary(user_id: str) -> None:
    async with async_session() as db:
        try:
            result = await db.execute(
                select(Questionnaire).where(Questionnaire.user_id == user_id)
            )
            questionnaire = result.scalar_one_or_none()
            if questionnaire:
                questionnaire.ai_summary_line = "Phase 9 implementation pending"
                db.add(questionnaire)
                await db.commit()
            else:
                logger.warning("No questionnaire found for user_id: %s", user_id)
        except Exception as e:
            logger.error("Error updating questionnaire for user_id %s: %s", user_id, e)
            await db.rollback()
            raise


@shared_task(name="generate_ai_analysis", bind=True, max_retries=3)
def generate_ai_analysis(self, user_id: str) -> None:
    logger.info(
        "AI analysis task triggered for user %s — "
        "GPT-4o brand analysis will be implemented in Phase 9",
        user_id,
    )
    logger.debug("[Celery] Generating AI analysis for user %s", user_id)
    try:
        asyncio.run(_update_questionnaire_summary(user_id))
    except Exception as exc:
        logger.error(f"Task failed for user {user_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)
