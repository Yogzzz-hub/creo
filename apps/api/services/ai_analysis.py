import json

from openai import OpenAI

from core.config import settings

openai_client = None


def _get_openai_client() -> OpenAI:
    global openai_client
    if openai_client is None:
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return openai_client


def generate_brand_analysis_prompt(questionnaire_data: dict) -> str:
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

    return system_prompt + "\n\n" + user_prompt


def call_openai_gpt4o(prompt_text: str) -> dict:
    messages = prompt_text.split("\n\n", 1)
    system_message = messages[0] if len(messages) > 0 else ""
    user_message = messages[1] if len(messages) > 1 else prompt_text

    client = _get_openai_client()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=1000,
    )

    content = response.choices[0].message.content
    return json.loads(content)
