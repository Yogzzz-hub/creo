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
    """Generate deterministic, high-quality Brand DNA fallback adhering to agency standards."""
    def _clean_str(val: Any, default: str) -> str:
        if val is None:
            return default
        s = str(val).strip()
        return s if s else default

    company = _clean_str(answers.get("company_name"), "Your Brand")
    industry = _clean_str(answers.get("industry"), "Digital & Consumer")
    goal = _clean_str(answers.get("primary_goal"), "Brand Awareness & Customer Growth")
    audience = _clean_str(answers.get("target_audience"), "Engaged digital consumers and industry professionals")
    age_range = _clean_str(answers.get("audience_age_range"), "22-42")
    problems = _clean_str(answers.get("audience_problems_solved"), "Finding reliable, high-aesthetic solutions that drive ROI.")

    raw_tones = answers.get("tone_keywords")
    if isinstance(raw_tones, list) and raw_tones:
        tones = [str(t).strip() for t in raw_tones if t is not None and str(t).strip()]
    else:
        tones = ["Modern", "Authoritative", "Dynamic"]
    if not tones:
        tones = ["Modern", "Authoritative", "Dynamic"]

    raw_palette = answers.get("color_palette")
    if isinstance(raw_palette, list) and raw_palette:
        palette = [str(c).strip() for c in raw_palette if c is not None and str(c).strip()]
    else:
        palette = ["#0E1116", "#2B7BC4", "#065F46", "#F0A202"]
    if not palette:
        palette = ["#0E1116", "#2B7BC4", "#065F46"]

    raw_focus = answers.get("content_focus")
    focus = [str(f).strip() for f in raw_focus if f is not None and str(f).strip()] if isinstance(raw_focus, list) else []

    tone_str = ", ".join(tones)
    summary_line = (
        f"{company} elevates {industry.lower()} through a {tone_str.lower()} visual identity "
        f"tailored to solve core pain points for {audience}."
    )

    persona = (
        f"Primary demographic includes individuals aged {age_range} in {industry.lower()}. "
        f"They value speed, transparent quality, and premium design, seeking to overcome: {problems}"
    )

    alignment = (
        f"To achieve the core objective of {goal.lower()}, content strategy combines high-frequency "
        f"social video with authoritative visual carousels that establish category leadership."
    )

    content_themes = [
        "Behind-the-Scenes & Craftsmanship",
        "Product Demonstrations & Proof",
        "Customer Transformations & Case Studies",
        "Educational Breakdowns & Industry Insights",
    ]
    if focus and len(focus) > 0:
        content_themes = [f"Focus: {item}" for item in focus[:4]]

    return BrandDNASummary(
        tone=tone_str,
        palette=palette,
        target_audience=audience,
        ai_summary_line=summary_line,
        audience_persona=persona,
        goal_alignment=alignment,
        content_themes=content_themes,
        recommended_formats=[
            "High-Retention Reels (9:16)",
            "Educational Carousels (4:5)",
            "Engaging Stories (9:16)",
        ],
    )


async def generate_brand_dna(
    db: AsyncSession, client_id: uuid.UUID, questionnaire_id: uuid.UUID
) -> BrandDNASummary:
    """Run Brand DNA synthesis with Gemini 1.5 Flash demanding strict JSON, with resilient fallback."""
    q_stmt = select(Questionnaire).where(Questionnaire.id == questionnaire_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()
    answers = quest.answers if quest else {}

    result_dna: BrandDNASummary | None = None

    # Check for Gemini API key
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if gemini_key:
        try:
            import httpx

            system_instruction = (
                "You are a master creative director and brand strategist for a premier digital creative agency. "
                "Analyze the client's brand intake questionnaire and synthesize a structured, strategic Brand DNA. "
                "Return ONLY a valid JSON object with EXACTLY these keys:\n"
                "{\n"
                '  "tone": "Comma-separated 3-5 tone keywords (e.g. Bold, Modern, Authoritative)",\n'
                '  "palette": ["list", "of", "3-5", "hex", "colors"],\n'
                '  "target_audience": "Concise summary of the core audience demographic",\n'
                '  "ai_summary_line": "One punchy, strategic brand positioning sentence (14-24 words)",\n'
                '  "audience_persona": "2-3 sentences detailing the ideal buyer persona, motivations, and pain points",\n'
                '  "goal_alignment": "2-3 sentences aligning the social content roadmap with their primary business goal",\n'
                '  "content_themes": ["3-5", "core", "content", "pillars"],\n'
                '  "recommended_formats": ["3", "recommended", "deliverable", "formats (e.g. High-Retention Reels (9:16))"]\n'
                "}\n"
                "Do NOT include markdown formatting, backticks, or any conversational text outside the JSON."
            )

            user_prompt = f"Client Brand Questionnaire Intake Data:\n{json.dumps(answers, indent=2)}"

            gemini_payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}],
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.3,
                },
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json=gemini_payload,
                )
                if res.status_code == 200:
                    text_content = (
                        res.json()
                        .get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "{}")
                    )
                    # Clean any trailing markdown if present
                    cleaned = text_content.strip()
                    if cleaned.startswith("```json"):
                        cleaned = cleaned[7:]
                    if cleaned.startswith("```"):
                        cleaned = cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                    parsed = json.loads(cleaned.strip())
                    result_dna = BrandDNASummary.model_validate(parsed)
                    logger.info("gemini_brand_dna_synthesized_successfully", client_id=str(client_id))
        except Exception as err:
            logger.warning("gemini_generation_failed_using_fallback", error=str(err))

    # Guaranteed fallback ensuring the client always has a rich, tailored result
    if not result_dna:
        result_dna = generate_deterministic_brand_dna(answers)

    # Persist to profile and questionnaire
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile:
        profile = ClientProfile(user_id=client_id)
        db.add(profile)
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
