import asyncio
import logging

from celery import shared_task
from sqlalchemy import select

from core.database import async_session
from models.questionnaire import Questionnaire
from models.user import User
from services.ai_analysis import call_openai_gpt4o, generate_brand_analysis_prompt

logger = logging.getLogger(__name__)


def _run_async(coroutine):
    return asyncio.run(coroutine)


async def _generate_ai_analysis_async(user_id: str) -> None:
    async with async_session() as db:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if user is None:
            logger.warning("[AI Analysis] User %s not found", user_id)
            return

        q_result = await db.execute(
            select(Questionnaire).where(Questionnaire.user_id == user_id)
        )
        questionnaire = q_result.scalar_one_or_none()

        if questionnaire is None:
            logger.warning("[AI Analysis] No questionnaire found for user %s", user_id)
            return

        questionnaire_data = {
            "industry": questionnaire.industry,
            "business_description": questionnaire.business_description,
            "target_audience": questionnaire.target_audience,
            "social_handles": questionnaire.social_handles,
            "current_posting_frequency": questionnaire.current_posting_frequency,
            "content_what_works": questionnaire.content_what_works,
            "content_what_doesnt": questionnaire.content_what_doesnt,
            "primary_goal": questionnaire.primary_goal,
            "brand_tone": questionnaire.brand_tone,
            "competitor_refs": questionnaire.competitor_refs,
            "topics_to_avoid": questionnaire.topics_to_avoid,
        }

        system_prompt, user_prompt = generate_brand_analysis_prompt(questionnaire_data)

        result = call_openai_gpt4o(system_prompt, user_prompt)
        analysis = result["analysis"]

        questionnaire.ai_analysis = analysis
        questionnaire.ai_summary_line = analysis.get("ai_summary_line")
        db.add(questionnaire)
        await db.commit()

        logger.info(
            "[AI Analysis] Completed for user %s (tokens=%d)",
            user_id,
            result.get("total_tokens", 0),
        )


@shared_task(name="generate_ai_analysis", bind=True, max_retries=3)
def generate_ai_analysis(self, user_id: str) -> None:
    """Generate AI brand analysis for a client's questionnaire submission."""
    try:
        logger.info("[Celery] Starting AI analysis for user %s", user_id)
        _run_async(_generate_ai_analysis_async(user_id))
    except Exception as exc:
        logger.error("[Celery] AI analysis failed for user %s. Retrying...", user_id)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
