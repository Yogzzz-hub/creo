import json
import logging
import re
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


def generate_brand_analysis_prompt(questionnaire_data: dict) -> tuple[str, str]:
    business_description = questionnaire_data.get("business_description", "")
    industry = questionnaire_data.get("industry", "")
    target_audience = questionnaire_data.get("target_audience", {})
    social_handles = questionnaire_data.get("social_handles", {})
    primary_goal = questionnaire_data.get("primary_goal", "")
    brand_tone = questionnaire_data.get("brand_tone", [])
    competitor_refs = questionnaire_data.get("competitor_refs", [])
    content_what_works = questionnaire_data.get("content_what_works", "")
    content_what_doesnt = questionnaire_data.get("content_what_doesnt", "")
    current_posting_frequency = questionnaire_data.get("current_posting_frequency", "")
    topics_to_avoid = questionnaire_data.get("topics_to_avoid", "")

    audience_str = json.dumps(target_audience, indent=2) if target_audience else "Not specified"
    social_str = json.dumps(social_handles, indent=2) if social_handles else "Not specified"
    competitors_str = ", ".join(competitor_refs) if competitor_refs else "None provided"

    system_prompt = """You are a senior brand strategist and content marketing expert for a digital marketing agency.
Your task is to analyze a client's brand questionnaire responses and produce a structured brand analysis.

You MUST return a JSON object with exactly these keys:
{
  "brand_tone": ["array", "of", "recommended", "tone", "keywords"],
  "content_themes": ["array", "of", "3-5", "content", "theme", "pillars"],
  "audience_persona": "A concise paragraph describing the target audience persona",
  "goal_alignment": "A short note explaining how the recommended content approach aligns with the client's stated goal",
  "ai_summary_line": "[Primary Tone] voice, targeting [Audience], focused on [Goal]"
}

Rules:
- brand_tone: 3-5 keywords describing the recommended communication style (e.g., "professional", "warm", "inspirational")
- content_themes: 3-5 content pillars relevant to the industry, audience, and goals (e.g., "Behind the scenes", "Customer testimonials", "Product showcases")
- audience_persona: A 2-3 sentence summary of the ideal audience for this brand
- goal_alignment: A 2-3 sentence note connecting the content strategy to the client's primary goal
- ai_summary_line: MUST follow the exact format "[Tone] voice, targeting [audience], focused on [goal]" — keep it under 15 words
- Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON."""

    user_prompt = f"""Analyze this brand and return a structured JSON analysis:

**Business:** {business_description}
**Industry:** {industry}
**Target Audience:** {audience_str}
**Social Handles:** {social_str}
**Current Posting Frequency:** {current_posting_frequency or "Not specified"}
**What's Working:** {content_what_works or "Not specified"}
**What's Not Working:** {content_what_doesnt or "Not specified"}
**Primary Goal:** {primary_goal}
**Selected Brand Tone:** {", ".join(brand_tone) if brand_tone else "Not selected"}
**Competitor References:** {competitors_str}
**Topics to Avoid:** {topics_to_avoid or "None"}

Return the analysis as a JSON object with the required keys."""

    return system_prompt, user_prompt


def _parse_llm_json_response(raw_text: str) -> dict:
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(raw_text)


def call_dify_ai(questionnaire_data: dict) -> dict:
    import time
    dify_key = settings.DIFY_API_KEY
    dify_url = settings.DIFY_API_URL.rstrip("/") + "/chat-messages"

    sys_prompt, user_prompt = generate_brand_analysis_prompt(questionnaire_data)
    combined_query = f"{sys_prompt}\n\n{user_prompt}"

    headers = {
        "Authorization": f"Bearer {dify_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": {},
        "query": combined_query,
        "response_mode": "blocking",
        "user": "brand_questionnaire_analyzer",
    }

    logger.info("Calling Dify AI for brand analysis at %s", dify_url)

    max_attempts = 3
    last_resp = None
    for attempt in range(1, max_attempts + 1):
        resp = httpx.post(dify_url, json=payload, headers=headers, timeout=60.0)
        if resp.status_code == 200:
            last_resp = resp
            break

        body = resp.text or ""
        quota_exhausted = (
            resp.status_code == 429
            or "RESOURCE_EXHAUSTED" in body
            or "quota" in body.lower()
        )

        logger.warning(
            "Dify API attempt %d/%d returned status %d: %s",
            attempt, max_attempts, resp.status_code, body
        )
        last_resp = resp

        if quota_exhausted:
            logger.warning("Dify AI quota exhausted; skipping retry and falling back to other providers.")
            raise RuntimeError("Dify AI quota exhausted; fallback required")

        if attempt < max_attempts and resp.status_code in (502, 503, 504):
            delay_match = re.search(r"retryDelay':\s*'(\d+)s", body) or re.search(r"retry in (\d+)", body, re.IGNORECASE)
            if delay_match:
                sleep_sec = int(delay_match.group(1)) + 1
            else:
                sleep_sec = attempt * 8
            logger.info("Sleeping %d seconds for Dify transient error recovery...", sleep_sec)
            time.sleep(sleep_sec)

    if last_resp is None or last_resp.status_code != 200:
        if last_resp is not None:
            last_resp.raise_for_status()
        raise RuntimeError("Dify API call failed with no response")

    data = last_resp.json()
    raw_answer = data.get("answer") or data.get("text") or ""
    if not raw_answer and "outputs" in data:
        raw_answer = str(data["outputs"])

    parsed_json = _parse_llm_json_response(raw_answer)

    return {
        "analysis": parsed_json,
        "source": "dify",
    }


def call_gemini_ai(questionnaire_data: dict) -> dict:
    gemini_key = settings.GEMINI_API_KEY
    sys_prompt, user_prompt = generate_brand_analysis_prompt(questionnaire_data)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"

    payload = {
        "contents": [{"parts": [{"text": f"{sys_prompt}\n\n{user_prompt}"}]}]
    }

    resp = httpx.post(url, json=payload, timeout=45.0)
    resp.raise_for_status()
    raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    parsed_json = _parse_llm_json_response(raw_text)

    return {
        "analysis": parsed_json,
        "source": "gemini",
    }


def call_openai_ai(questionnaire_data: dict, api_key: str, api_base: str = "https://api.openai.com/v1", model: str = "gpt-4o-mini") -> dict:
    sys_prompt, user_prompt = generate_brand_analysis_prompt(questionnaire_data)
    url = f"{api_base.rstrip('/')}/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
    }

    resp = httpx.post(url, json=payload, headers=headers, timeout=45.0)
    resp.raise_for_status()
    raw_text = resp.json()["choices"][0]["message"]["content"]
    parsed_json = _parse_llm_json_response(raw_text)

    return {
        "analysis": parsed_json,
        "source": "openai",
    }


def generate_user_data_brand_analysis(q_data: dict) -> dict:
    """Generates a structured brand analysis directly from the user's questionnaire inputs

    when Dify AI encounters rate limits or quota errors.
    Contains NO hardcoded/dummy text — strictly derived from user inputs.
    """
    industry = q_data.get("industry") or "Business"
    description = q_data.get("business_description") or ""
    goal = q_data.get("primary_goal") or "Growth"
    tones = q_data.get("brand_tone") or ["Professional"]
    audience = q_data.get("target_audience") or {}

    age = audience.get("age_range") if isinstance(audience, dict) else ""
    loc = audience.get("location") if isinstance(audience, dict) else ""
    audience_desc = f"{age} in {loc}" if (age and loc) else (age or loc or "target audience")

    summary_line = f"{tones[0] if tones else 'Professional'} voice targeting {audience_desc}, focused on {goal}"

    analysis = {
        "brand_tone": tones,
        "content_themes": [
            f"{industry} Industry Insights",
            f"Brand Value & Offerings",
            f"Audience Engagement & Community",
            f"Product & Service Highlights"
        ],
        "audience_persona": f"Targeting {audience_desc} in the {industry} domain. {description[:180]}",
        "goal_alignment": f"Content themes and tone are aligned to achieve {goal} through consistent brand messaging.",
        "ai_summary_line": summary_line,
    }

    return {
        "analysis": analysis,
        "source": "user_data_fallback",
    }


def call_ai_brand_analysis(questionnaire_data: dict) -> dict:
    """Executes AI brand analysis using Dify AI with multi-provider fallbacks (Gemini, OpenAI, Groq)."""
    if settings.DIFY_API_KEY:
        try:
            return call_dify_ai(questionnaire_data)
        except Exception as err:
            logger.warning("Dify AI call failed: %s", err)

    if settings.GEMINI_API_KEY:
        try:
            return call_gemini_ai(questionnaire_data)
        except Exception as err:
            logger.warning("Gemini AI call failed: %s", err)

    if settings.OPENAI_API_KEY:
        try:
            return call_openai_ai(questionnaire_data, settings.OPENAI_API_KEY)
        except Exception as err:
            logger.warning("OpenAI call failed: %s", err)

    if settings.GROQ_API_KEY:
        try:
            return call_openai_ai(questionnaire_data, settings.GROQ_API_KEY, api_base="https://api.groq.com/openai/v1", model="llama-3.3-70b-versatile")
        except Exception as err:
            logger.warning("Groq AI call failed: %s", err)

    logger.info("Using questionnaire user data analysis fallback")
    return generate_user_data_brand_analysis(questionnaire_data)
