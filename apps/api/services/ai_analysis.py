import json
import logging

import httpx

# pyrefly: ignore [missing-import]
from openai import OpenAI

from core.config import settings

logger = logging.getLogger(__name__)


def generate_brand_analysis_prompt(
    questionnaire_data: dict,
) -> tuple[str, str]:
    business_description = questionnaire_data.get(
        "business_description", ""
    )
    industry = questionnaire_data.get("industry", "")
    target_audience = questionnaire_data.get(
        "target_audience", {}
    )
    social_handles = questionnaire_data.get(
        "social_handles", {}
    )
    primary_goal = questionnaire_data.get("primary_goal", "")
    brand_tone = questionnaire_data.get("brand_tone", [])
    competitor_refs = questionnaire_data.get(
        "competitor_refs", []
    )
    content_what_works = questionnaire_data.get(
        "content_what_works", ""
    )
    content_what_doesnt = questionnaire_data.get(
        "content_what_doesnt", ""
    )
    current_posting_frequency = questionnaire_data.get(
        "current_posting_frequency", ""
    )
    topics_to_avoid = questionnaire_data.get(
        "topics_to_avoid", ""
    )

    audience_str = (
        json.dumps(target_audience, indent=2)
        if target_audience
        else "Not specified"
    )

    social_str = (
        json.dumps(social_handles, indent=2)
        if social_handles
        else "Not specified"
    )

    competitors_str = (
        ", ".join(competitor_refs)
        if competitor_refs
        else "None provided"
    )

    system_prompt = """
You are a senior brand strategist and content marketing expert
for a digital marketing agency.

Your task is to analyze a client's brand questionnaire responses
and produce a structured brand analysis.

You MUST return a JSON object with exactly these keys:

{
  "brand_tone": [
    "array",
    "of",
    "recommended",
    "tone",
    "keywords"
  ],
  "content_themes": [
    "array",
    "of",
    "3-5",
    "content",
    "theme",
    "pillars"
  ],
  "audience_persona": "A concise paragraph describing the target audience persona",
  "goal_alignment": "A short note explaining how the recommended content approach aligns with the client's stated goal",
  "ai_summary_line": "[Primary Tone] voice, targeting [Audience], focused on [Goal]"
}

Rules:

- brand_tone: 3-5 keywords describing the recommended
  communication style.
  Examples: "professional", "warm", "inspirational".

- content_themes: 3-5 content pillars relevant to the
  industry, audience, and goals.
  Examples: "Behind the scenes", "Customer testimonials",
  "Product showcases".

- audience_persona: A 2-3 sentence summary of the ideal
  audience for this brand.

- goal_alignment: A 2-3 sentence note connecting the
  content strategy to the client's primary goal.

- ai_summary_line: MUST follow the exact format:
  "[Tone] voice, targeting [audience], focused on [goal]"

- ai_summary_line must be under 15 words.

- Return ONLY valid JSON.

- Do not return markdown.

- Do not return code blocks.

- Do not include explanations outside the JSON.
"""

    user_prompt = f"""
Analyze this brand and return a structured JSON analysis:

Business: {business_description}

Industry: {industry}

Target Audience:
{audience_str}

Social Handles:
{social_str}

Current Posting Frequency:
{current_posting_frequency or "Not specified"}

What's Working:
{content_what_works or "Not specified"}

What's Not Working:
{content_what_doesnt or "Not specified"}

Primary Goal:
{primary_goal}

Selected Brand Tone:
{", ".join(brand_tone) if brand_tone else "Not selected"}

Competitor References:
{competitors_str}

Topics to Avoid:
{topics_to_avoid or "None"}

Return the analysis as a JSON object with the required keys.
"""

    return system_prompt, user_prompt


def call_dify_ai_analysis(
    system_message: str,
    user_message: str,
    user_id: str = "system",
) -> dict:
    """
    Call the Dify AI Chatbot / Completion API to generate
    structured brand analysis.
    """

    if not settings.DIFY_API_KEY:
        raise ValueError(
            "DIFY_API_KEY is not configured in settings"
        )

    dify_url = (
        f"{settings.DIFY_API_URL.rstrip('/')}"
        "/chat-messages"
    )

    prompt_query = (
        f"{system_message}\n\n"
        f"{user_message}"
    )

    payload = {
        "inputs": {},
        "query": prompt_query,
        "response_mode": "blocking",
        "user": user_id,
    }

    headers = {
        "Authorization": (
            f"Bearer {settings.DIFY_API_KEY}"
        ),
        "Content-Type": "application/json",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    logger.info(
        "[dify_ai_analysis] Sending request to Dify API: %s",
        dify_url,
    )

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                dify_url,
                json=payload,
                headers=headers,
            )
    except httpx.RequestError as exc:
        logger.exception(
            "[dify_ai_analysis] Request to Dify failed: %s",
            exc,
        )
        raise RuntimeError(
            f"Unable to connect to Dify API: {exc}"
        ) from exc

    if response.status_code != 200:
        logger.error(
            "[dify_ai_analysis] Dify returned status %d: %s",
            response.status_code,
            response.text[:500],
        )

        raise RuntimeError(
            f"Dify API error {response.status_code}: "
            f"{response.text[:200]}"
        )

    try:
        data = response.json()
    except json.JSONDecodeError as exc:
        logger.error(
            "[dify_ai_analysis] Dify returned invalid JSON: %s",
            response.text[:500],
        )
        raise ValueError(
            "Dify returned an invalid JSON response."
        ) from exc

    answer_text = data.get("answer", "").strip()

    if not answer_text:
        logger.error(
            "[dify_ai_analysis] Dify returned an empty answer."
        )
        raise ValueError(
            "Dify returned an empty response."
        )

    # Remove markdown code fences if Dify returns them.
    if answer_text.startswith("```"):
        lines = answer_text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]

        answer_text = "\n".join(lines).strip()

    try:
        analysis_dict = json.loads(answer_text)
    except json.JSONDecodeError as exc:
        logger.error(
            "[dify_ai_analysis] Failed to parse JSON "
            "from Dify answer: %s",
            answer_text[:500],
        )

        raise ValueError(
            f"Dify response is not valid JSON: {exc}"
        ) from exc

    metadata = data.get("metadata", {})
    usage = metadata.get("usage", {})

    return {
        "analysis": analysis_dict,
        "prompt_tokens": usage.get(
            "prompt_tokens",
            0,
        ),
        "completion_tokens": usage.get(
            "completion_tokens",
            0,
        ),
        "total_tokens": usage.get(
            "total_tokens",
            0,
        ),
    }


def call_openai_gpt4o(
    system_message: str,
    user_message: str,
) -> dict:
    """
    Backward-compatible alias.

    Brand analysis requests are routed through Dify AI.
    """

    return call_dify_ai_analysis(
        system_message,
        user_message,
    )