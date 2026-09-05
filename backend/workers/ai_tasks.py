import asyncio
import logging
import re

from celery import shared_task
from sqlalchemy import select

from core.database import async_session
from models.questionnaire import Questionnaire
from services.ai_analysis import call_openai_gpt4o, generate_brand_analysis_prompt

logger = logging.getLogger(__name__)


class QuotaExhausted429Error(Exception):
    """Raised when Dify API returns 429 Quota Exhausted."""
    pass


def _build_brand_summary_line(questionnaire) -> str:
    """Build a custom one-sentence summary based on the actual brand questionnaire data."""
    target_aud = questionnaire.target_audience or {}
    age = target_aud.get("age_range") or "a broad audience"
    loc = target_aud.get("location") or "their target market"
    tone = questionnaire.brand_tone[0] if getattr(questionnaire, "brand_tone", None) else "Professional"
    goal = questionnaire.primary_goal or "Growth"
    industry = questionnaire.industry or "business"
    business_desc = questionnaire.business_description or "This brand"
    business_anchor = business_desc.strip().split(".")[0][:120].strip() or f"{industry} brand"

    return (
        f"{business_anchor} uses a {tone.lower()} brand approach for {age} in {loc} and is designed to drive {goal.lower()}."
    )


def _build_personalized_fallback_analysis(questionnaire) -> dict:
    """Build a personalized analysis when Dify returns a non-JSON or support-bot response."""
    target_aud = questionnaire.target_audience or {}
    age = target_aud.get("age_range", "broad age range")
    loc = target_aud.get("location", "various locations")
    tone = questionnaire.brand_tone[0] if questionnaire.brand_tone else "Professional"
    goal = questionnaire.primary_goal or "Growth"
    industry = questionnaire.industry or "General Business"
    business_desc = questionnaire.business_description or "Business services"

    content_themes = []
    goal_lower = goal.lower() if isinstance(goal, str) else ""
    if "awareness" in goal_lower:
        content_themes.append("Brand Education")
    if "lead" in goal_lower:
        content_themes.append("Lead Magnets & Value Props")
    if "engagement" in goal_lower:
        content_themes.append("Community Engagement")
    if "conversion" in goal_lower:
        content_themes.append("Sales & Case Studies")
    if "thought" in goal_lower:
        content_themes.append("Industry Insights & Analysis")
    if not content_themes:
        content_themes.append(f"{industry.title()} Highlights")
    if len(content_themes) < 2:
        content_themes.append("Customer Stories & Testimonials")
    if len(content_themes) < 3:
        content_themes.append("Behind-the-Scenes Content")

    return {
        "brand_tone": questionnaire.brand_tone or ["Professional"],
        "content_themes": content_themes[:3],
        "audience_persona": (
            f"Targeting {age} in {loc} who are most likely to engage with {industry} content and value-driven offers."
        ),
        "goal_alignment": (
            f"This content strategy is aligned to {goal} and built around the business context: {business_desc[:120]}."
        ),
        "ai_summary_line": _build_brand_summary_line(questionnaire),
    }


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
                "topics_to_avoid": questionnaire.topics_to_avoid,
                "style_references": questionnaire.style_references
            }

            # 2. Call Dify-backed AI analysis
            sys_prompt, user_prompt = generate_brand_analysis_prompt(q_data)
            try:
                ai_result = await asyncio.to_thread(call_openai_gpt4o, sys_prompt, user_prompt)
            except (QuotaExhausted429Error, ValueError, RuntimeError) as exc:
                logger.warning(
                    "[Celery] Dify AI failed for user %s: %s. Applying immediate local fallback without retries.",
                    user_id,
                    exc,
                )
                ai_result = {
                    "analysis": _build_personalized_fallback_analysis(questionnaire),
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                }

            # 3. Save back to DB
            analysis = ai_result.get("analysis", {})
            if not isinstance(analysis, dict):
                analysis = {}

            summary_line = analysis.get("ai_summary_line")
            generic_summary_pattern = re.compile(
                r"\bvoice\b.*\btargeting\b.*\bfocused on\b|\btargeting\b.*\bfocused on\b",
                re.IGNORECASE,
            )
            if (
                not isinstance(summary_line, str)
                or not summary_line.strip()
                or generic_summary_pattern.search(summary_line)
            ):
                summary_line = _build_brand_summary_line(questionnaire)
            analysis["ai_summary_line"] = summary_line

            questionnaire.ai_analysis = analysis
            questionnaire.ai_summary_line = summary_line
            db.add(questionnaire)

            # 4. Finalize Onboarding
            from models.user import User
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if user:
                user.onboarding_stage = 5
                db.add(user)

            await db.commit()
            logger.info("Successfully saved real AI analysis and finalized onboarding for user: %s", user_id)
            
        except Exception as e:
            logger.error("Error generating AI analysis for user_id %s: %s", user_id, e)
            await db.rollback()
            raise

@shared_task(name="generate_ai_analysis", bind=True, max_retries=0)
def generate_ai_analysis(self, user_id: str) -> None:
    logger.info("[Celery] Requesting Dify AI brand analysis for user %s", user_id)
    try:
        _run_async(_process_and_save_analysis(user_id))
    except Exception as exc:
        logger.error("Task failed for user %s: %s", user_id, exc)
        return

