import asyncio
import logging

from celery import shared_task
from sqlalchemy import select

from core.database import async_session
from models.questionnaire import Questionnaire
from services.ai_analysis import call_openai_gpt4o, generate_brand_analysis_prompt

logger = logging.getLogger(__name__)

def _run_async(coro):
    """Run an async coroutine in a new event loop for Celery."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)

async def _process_and_save_analysis(user_id: str) -> None:
    async with async_session() as db:
        try:
            result = await db.execute(
                select(Questionnaire).where(Questionnaire.user_id == user_id)
            )
            questionnaire = result.scalar_one_or_none()
            
            if not questionnaire:
                logger.error("Questionnaire not found for user_id: %s", user_id)
                return

            # 1. Convert DB model to dict for prompt generator
            q_data = {
                "business_description": questionnaire.business_description,
                "industry": questionnaire.industry,
                "target_audience": questionnaire.target_audience,
                "social_handles": questionnaire.social_handles,
                "primary_goal": questionnaire.primary_goal,
                "brand_tone": questionnaire.brand_tone,
                "competitor_refs": questionnaire.competitor_refs,
                "content_what_works": questionnaire.content_what_works,
                "content_what_doesnt": questionnaire.content_what_doesnt,
                "current_posting_frequency": questionnaire.current_posting_frequency,
                "topics_to_avoid": questionnaire.topics_to_avoid
            }

            # 2. Call OpenAI
            sys_prompt, user_prompt = generate_brand_analysis_prompt(q_data)
            analysis_result = call_openai_gpt4o(sys_prompt, user_prompt)

            # 3. Save back to DB
            questionnaire.ai_analysis = analysis_result
            questionnaire.ai_summary_line = analysis_result.get("ai_summary_line", "Analysis complete")
            
            db.add(questionnaire)
            await db.commit()
            logger.info("Successfully saved real AI analysis for user: %s", user_id)
            
        except Exception as e:
            logger.error("Error generating AI analysis for user_id %s: %s", user_id, e)
            await db.rollback()
            raise

@shared_task(name="generate_ai_analysis", bind=True, max_retries=3)
def generate_ai_analysis(self, user_id: str) -> None:
    logger.info("[Celery] Requesting OpenAI brand analysis for user %s", user_id)
    try:
        _run_async(_process_and_save_analysis(user_id))
    except Exception as exc:
        logger.error(f"Task failed for user {user_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)