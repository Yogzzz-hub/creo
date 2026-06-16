import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session
from models.questionnaire import Questionnaire
from services.ai_analysis import call_openai_gpt4o, generate_brand_analysis_prompt
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _process_questionnaire(questionnaire_id: str):
    async with async_session() as db:
        try:
            result = await db.execute(
                select(Questionnaire).where(Questionnaire.id == questionnaire_id)
            )
            questionnaire = result.scalar_one_or_none()

            if questionnaire is None:
                logger.error(f"Questionnaire {questionnaire_id} not found")
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
            ai_result = call_openai_gpt4o(system_prompt, user_prompt)

            required_keys = {
                "brand_tone",
                "content_themes",
                "audience_persona",
                "goal_alignment",
                "ai_summary_line",
            }
            if not isinstance(ai_result, dict):
                raise ValueError("AI result must be a JSON object")
            missing = required_keys - set(ai_result.keys())
            if missing:
                raise ValueError(f"AI result missing required keys: {sorted(missing)}")
            summary_line = ai_result.get("ai_summary_line")
            if not isinstance(summary_line, str) or not summary_line.strip():
                raise ValueError("ai_summary_line must be a non-empty string")

            questionnaire.ai_analysis = ai_result
            questionnaire.ai_summary_line = summary_line
            db.add(questionnaire)
            await db.commit()

            logger.info(
                f"AI analysis generated for questionnaire {questionnaire_id}: "
                f"{questionnaire.ai_summary_line}"
            )

        except Exception as e:
            logger.error(f"Error processing questionnaire {questionnaire_id}: {e}")
            await db.rollback()
            raise


RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
)


@celery_app.task(
    name="generate_ai_analysis",
    bind=True,
    max_retries=3,
    default_retry_backoff=True,
    default_retry_backoff_max=600,
)
def generate_ai_analysis(self, questionnaire_id: str):
    try:
        asyncio.run(_process_questionnaire(questionnaire_id))
    except RETRYABLE_EXCEPTIONS as exc:
        logger.warning(
            f"Retryable error for questionnaire {questionnaire_id}: {exc}"
        )
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    except Exception as exc:
        logger.error(
            f"Non-retryable failure for questionnaire {questionnaire_id}: {exc}"
        )
        raise
