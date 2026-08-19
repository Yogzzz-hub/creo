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

from unittest.mock import patch, MagicMock
from routers.questionnaires import trigger_ai_analysis

@patch("redis.Redis.from_url")
@patch("workers.celery_app.celery_app.control.ping")
@patch("workers.ai_tasks.generate_ai_analysis.delay")
@patch("workers.ai_tasks.generate_ai_analysis")
def test_trigger_ai_analysis_worker_available(mock_sync, mock_delay, mock_ping, mock_redis):
    # Setup mocks
    mock_redis_instance = MagicMock()
    mock_redis.return_value = mock_redis_instance
    mock_ping.return_value = [{"celery@worker1": {"ok": "pong"}}]

    # Execute
    result = trigger_ai_analysis("user123")

    # Verify
    assert result is True
    mock_redis.assert_called_once()
    mock_redis_instance.ping.assert_called_once()
    mock_ping.assert_called_once_with(timeout=0.1)
    mock_delay.assert_called_once_with("user123")
    mock_sync.assert_not_called()

@patch("redis.Redis.from_url")
@patch("workers.celery_app.celery_app.control.ping")
@patch("workers.ai_tasks.generate_ai_analysis.delay")
@patch("workers.ai_tasks.generate_ai_analysis")
def test_trigger_ai_analysis_no_worker_available(mock_sync, mock_delay, mock_ping, mock_redis):
    # Setup mocks
    mock_redis_instance = MagicMock()
    mock_redis.return_value = mock_redis_instance
    mock_ping.return_value = None  # No workers

    # Execute
    result = trigger_ai_analysis("user123")

    # Verify
    assert result is True
    mock_ping.assert_called_once_with(timeout=0.1)
    mock_delay.assert_not_called()
    mock_sync.assert_called_once_with("user123")

@patch("redis.Redis.from_url")
@patch("workers.ai_tasks.generate_ai_analysis.delay")
@patch("workers.ai_tasks.generate_ai_analysis")
def test_trigger_ai_analysis_redis_unavailable(mock_sync, mock_delay, mock_redis):
    # Setup mock to raise Exception on ping
    mock_redis_instance = MagicMock()
    mock_redis_instance.ping.side_effect = Exception("Connection refused")
    mock_redis.return_value = mock_redis_instance

    # Execute
    result = trigger_ai_analysis("user123")

    # Verify
    assert result is True
    mock_delay.assert_not_called()
    mock_sync.assert_called_once_with("user123")
