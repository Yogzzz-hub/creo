from types import SimpleNamespace

from workers.ai_tasks import _build_personalized_fallback_analysis


def test_build_personalized_fallback_analysis_uses_questionnaire_data():
    questionnaire = SimpleNamespace(
        industry="fitness coaching",
        primary_goal="Lead Generation",
        target_audience={"age_range": "25-40", "location": "Bangalore"},
        brand_tone=["confident", "friendly"],
        business_description="We help busy professionals build sustainable fitness habits.",
    )

    analysis = _build_personalized_fallback_analysis(questionnaire)

    assert "brand_tone" in analysis
    assert "content_themes" in analysis
    assert "audience_persona" in analysis
    assert "goal_alignment" in analysis
    assert "ai_summary_line" in analysis
    assert "Lead Generation" in analysis["goal_alignment"]
    assert "Bangalore" in analysis["audience_persona"]
    assert "confident" in analysis["brand_tone"]
    assert "fitness" in analysis["ai_summary_line"].lower()
    assert "Bangalore" in analysis["ai_summary_line"]
    assert "voice" not in analysis["ai_summary_line"].lower()
