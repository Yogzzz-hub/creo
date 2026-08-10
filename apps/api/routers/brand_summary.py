import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import require_client
from models.questionnaire import Questionnaire
from models.user import User
from schemas.brand_summary import BrandSummaryResponse, GenerateBrandSummaryRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/brand-summary", tags=["brand-summary"])


def _generate_mock_brand_summary(questionnaire_data: dict) -> str:
    industry = questionnaire_data.get("industry", "your industry")
    audience = questionnaire_data.get("target_audience", {})
    tone = questionnaire_data.get("brand_tone", [])
    goal = questionnaire_data.get("primary_goal", "growth")
    competitors = questionnaire_data.get("competitor_refs", [])
    description = questionnaire_data.get("business_description", "your business")

    audience_segment = audience.get("age_range", "25-45")
    audience_interests = ", ".join(audience.get("interests", [])) if audience.get("interests") else "digital-first consumers"

    tone_str = ", ".join(tone[:3]) if tone else "professional, approachable, modern"
    competitor_str = (
        f"We benchmark against players like {', '.join(competitors[:2])}. "
        if competitors
        else ""
    )

    paragraph1 = (
        f"{description} operates in the {industry} space, "
        f"targeting a core demographic of {audience_segment} year olds who are {audience_interests}. "
        f"Our recommended brand voice blends {tone_str} to resonate with this audience "
        f"while differentiating from the competitive landscape. {competitor_str}"
    )

    paragraph2 = (
        f"To achieve your goal of {goal.lower()}, we recommend a content strategy built on "
        f"three pillars: education-driven thought leadership to build trust, "
        f"behind-the-scenes authenticity to humanize the brand, and community-centric engagement "
        f"to foster loyalty. This approach positions your brand as both an authority and a relatable "
        f"partner in the {industry} space, driving meaningful conversions over vanity metrics."
    )

    paragraph3 = (
        f"Execution-wise, your content calendar should prioritize short-form video and carousel posts "
        f"for maximum reach, supplemented by long-form stories for depth. We recommend posting 4-5 times "
        f"per week with a mix of original and curated content, and using a consistent visual template "
        f"that reinforces brand recognition across all platforms."
    )

    return f"{paragraph1}\n\n{paragraph2}\n\n{paragraph3}"


async def _build_questionnaire_data(questionnaire: Questionnaire) -> dict:
    return {
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
    }


@router.post("/generate", response_model=BrandSummaryResponse)
async def generate_brand_summary(
    current_user: Annotated[User, Depends(require_client)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Questionnaire).where(Questionnaire.user_id == current_user.id)
    )
    questionnaire = result.scalar_one_or_none()

    if questionnaire is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You must complete the brand questionnaire before generating a summary.",
        )

    q_data = await _build_questionnaire_data(questionnaire)

    if settings.DIFY_API_KEY or settings.OPENAI_API_KEY:
        try:
            from services.ai_analysis import (
                call_dify_ai_analysis,
                generate_brand_analysis_prompt,
            )

            sys_prompt, user_prompt = generate_brand_analysis_prompt(q_data)
            ai_result = call_dify_ai_analysis(sys_prompt, user_prompt, user_id=str(current_user.id))
            analysis = ai_result.get("analysis", {})
            brand_summary = analysis.get("ai_summary_line", "Analysis complete")

            questionnaire.ai_analysis = analysis
            questionnaire.ai_summary_line = brand_summary

            db.add(questionnaire)
            await db.commit()

            return BrandSummaryResponse(
                brand_summary=brand_summary,
                source="ai",
            )
        except Exception as e:
            logger.error("Dify AI call failed for user %s: %s — falling back to mock", current_user.id, e)

    mock_summary = _generate_mock_brand_summary(q_data)
    questionnaire.ai_summary_line = mock_summary

    db.add(questionnaire)
    await db.commit()

    return BrandSummaryResponse(
        brand_summary=mock_summary,
        source="mock",
    )
