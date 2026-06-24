import asyncio
import json
import logging

from celery import shared_task
from sqlalchemy import select

from core.database import async_session
from models.audit import QuestionnaireAuditLog
from models.questionnaire import Questionnaire
from models.user import User
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

            q_data = {
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

            sys_prompt, user_prompt = generate_brand_analysis_prompt(q_data)
            openai_result = call_openai_gpt4o(sys_prompt, user_prompt)
            analysis_result = openai_result["analysis"]

            required_keys = {
                "brand_tone",
                "content_themes",
                "audience_persona",
                "goal_alignment",
                "ai_summary_line",
            }
            if not isinstance(analysis_result, dict):
                raise ValueError("AI result must be a JSON object")
            missing = required_keys - set(analysis_result.keys())
            if missing:
                raise ValueError(f"AI result missing required keys: {sorted(missing)}")
            summary_line = analysis_result.get("ai_summary_line")
            if not isinstance(summary_line, str) or not summary_line.strip():
                raise ValueError("ai_summary_line must be a non-empty string")

            old_analysis = questionnaire.ai_analysis
            old_summary = questionnaire.ai_summary_line

            if old_analysis is not None or old_summary is not None:
                audit_log = QuestionnaireAuditLog(
                    questionnaire_id=questionnaire.id,
                    changed_by_user_id=None,
                    change_source="ai_worker",
                    old_ai_analysis=old_analysis,
                    new_ai_analysis=analysis_result,
                    old_summary_line=old_summary,
                    new_summary_line=summary_line,
                )
                db.add(audit_log)

            questionnaire.ai_analysis = analysis_result
            questionnaire.ai_summary_line = summary_line
            questionnaire.prompt_tokens = openai_result["prompt_tokens"]
            questionnaire.completion_tokens = openai_result["completion_tokens"]
            questionnaire.total_tokens = openai_result["total_tokens"]

            db.add(questionnaire)
            await db.commit()
            logger.info(
                "AI analysis generated for user %s: %s (tokens: %d prompt, %d completion)",
                user_id, summary_line,
                openai_result["prompt_tokens"], openai_result["completion_tokens"],
            )

            from workers.notification_tasks import notify_ai_analysis_complete

            user_result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                notify_ai_analysis_complete.delay(
                    user_id=user_id,
                    client_email=user.email,
                    client_name=user.full_name,
                    summary_line=summary_line,
                )

        except Exception as e:
            logger.error("Error generating AI analysis for user_id %s: %s", user_id, e)
            await db.rollback()
            raise


RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
    json.JSONDecodeError,
)


@shared_task(name="generate_ai_analysis", bind=True, max_retries=3, time_limit=120)
def generate_ai_analysis(self, user_id: str) -> None:
    logger.info("[Celery] Requesting OpenAI brand analysis for user %s", user_id)
    try:
        _run_async(_process_and_save_analysis(user_id))
    except RETRYABLE_EXCEPTIONS as exc:
        logger.warning(
            "Retryable error for user %s: %s", user_id, exc
        )
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    except Exception as exc:
        logger.error("Non-retryable failure for user %s: %s", user_id, exc)
        raise
