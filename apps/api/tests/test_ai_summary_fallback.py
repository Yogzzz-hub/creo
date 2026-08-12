import json
from unittest.mock import patch

from services.ai_analysis import call_ai_brand_analysis


@patch("services.ai_analysis.settings.GROQ_API_KEY", "")
@patch("services.ai_analysis.settings.OPENAI_API_KEY", "")
@patch("services.ai_analysis.settings.GEMINI_API_KEY", "")
@patch("services.ai_analysis.settings.DIFY_API_KEY", "test-key")
@patch("services.ai_analysis.httpx.post")
def test_call_ai_brand_analysis_falls_back_without_long_retry_when_dify_is_quota_exhausted(
    mock_post,
):
    mock_response = mock_post.return_value
    mock_response.status_code = 429
    mock_response.text = (
        '{"error": {"message": "You exceeded your current quota", "status": "RESOURCE_EXHAUSTED"}}'
    )

    with patch("time.sleep") as mock_sleep:
        result = call_ai_brand_analysis({
            "industry": "Fitness Studio",
            "business_description": "Boutique studio for busy professionals",
            "primary_goal": "Lead Generation",
            "brand_tone": ["Professional", "Energetic"],
            "target_audience": {
                "age_range": "25-45",
                "gender": "All Genders",
                "location": "Bengaluru",
                "interests": "wellness, fitness",
            },
            "social_handles": {
                "instagram": "@fitstudio",
                "facebook": "",
                "tiktok": "",
                "linkedin": "",
                "other_platforms": "",
            },
            "current_posting_frequency": "2 posts/week",
            "content_what_works": "Short reels and client wins",
            "content_what_doesnt": "Overly promotional copy",
            "competitor_refs": ["Nike", "Cult.fit"],
            "topics_to_avoid": "Politics",
            "style_references": ["clean", "bold"],
        })

    assert result["source"] == "user_data_fallback"
    assert "ai_summary_line" in result["analysis"]
    mock_sleep.assert_not_called()
