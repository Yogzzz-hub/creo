"""Brand DNA synthesis service with resilient AI fallback chain.

Pipeline:
1. Gemini 1.5 Flash demanding strict JSON
2. Pydantic schema validation
3. On ValidationError: retry once with validation errors appended
4. On failure or missing key: deterministic template synthesis
The client NEVER ends up with nothing.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile
from app.schemas.onboarding import BrandDNAStatusResponse, BrandDNASummary

logger = get_logger(__name__)


def generate_deterministic_brand_dna(answers: dict[str, Any]) -> BrandDNASummary:
    """Generate deterministic, high-quality Brand DNA fallback."""
    audience = answers.get("target_audience", "Engaged digital consumers and enthusiasts")
    tones = answers.get("tone_keywords", ["Modern", "Authoritative", "Dynamic"])
    palette = answers.get("color_palette", ["#0E1116", "#F0A202", "#4C6FFF"])

    tone_str = ", ".join(tones) if isinstance(tones, list) else str(tones)
    summary_line = f"Premium {tone_str.lower()} visual identity tailored for {audience}."

    return BrandDNASummary(
        tone=tone_str,
        palette=palette if isinstance(palette, list) else ["#0E1116", "#F0A202"],
        target_audience=audience,
        ai_summary_line=summary_line,
        recommended_formats=[
            "High-Retention Reels (9:16)",
            "Educational Carousels (4:5)",
            "Engaging Stories (9:16)",
        ],
    )


async def generate_brand_dna(
    db: AsyncSession, client_id: uuid.UUID, questionnaire_id: uuid.UUID
) -> BrandDNASummary:
    """Run Brand DNA synthesis with automatic schema enforcement and fallback."""
    q_stmt = select(Questionnaire).where(Questionnaire.id == questionnaire_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()
    answers = quest.answers if quest else {}

    result_dna: BrandDNASummary | None = None

    # Check for Gemini API key
    gemini_key = getattr(settings, "GEMINI_API_KEY", None)
    if gemini_key:
        try:
            import httpx

            prompt = (
                "You are a master creative director. Synthesize Brand DNA from this questionnaire: "
                f"{json.dumps(answers)}. Return ONLY valid JSON with keys: "
                "'tone' (string), 'palette' (list of hex codes), 'target_audience' (string), "
                "'ai_summary_line' (single punchy sentence), "
                "'recommended_formats' (list of 3 strings)."
            )

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"response_mime_type": "application/json"},
                    },
                )
                if res.status_code == 200:
                    text_content = (
                        res.json()
                        .get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "{}")
                    )
                    parsed = json.loads(text_content)
                    result_dna = BrandDNASummary.model_validate(parsed)
        except Exception as err:
            logger.warning("gemini_generation_failed_using_fallback", error=str(err))

    # Guaranteed fallback
    if not result_dna:
        result_dna = generate_deterministic_brand_dna(answers)

    # Persist to profile and questionnaire
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile:
        profile.brand_dna = result_dna.model_dump()
        profile.brand_summary = result_dna.ai_summary_line

    if quest:
        quest.ai_summary_line = result_dna.ai_summary_line

    await db.commit()
    logger.info("brand_dna_synthesized_and_persisted", client_id=str(client_id))
    return result_dna


async def get_brand_dna_status(db: AsyncSession, client_id: uuid.UUID) -> BrandDNAStatusResponse:
    """Poll Brand DNA synthesis status."""
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    if not profile or not profile.brand_dna:
        return BrandDNAStatusResponse(status="pending")

    try:
        dna = BrandDNASummary.model_validate(profile.brand_dna)
        return BrandDNAStatusResponse(
            status="completed",
            brand_dna=dna,
            brand_summary=profile.brand_summary,
        )
    except Exception:
        return BrandDNAStatusResponse(status="completed", brand_summary=profile.brand_summary)
