"""
Integration test stubs for Phase 9 — Third-party Integrations.

Tests verify that Celery task registration, service function signatures,
and key imports are correct. External HTTP calls are not tested live.
"""

import inspect

import pytest


# ---------------------------------------------------------------------------
# Task 9.17 — Celery task registration tests
# ---------------------------------------------------------------------------


class TestCeleryTaskRegistration:
    """Verify that all automation Celery tasks are registered and callable."""

    def test_check_sla_breaches_is_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "check-sla-breaches" in task_names

    def test_send_renewal_reminders_is_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "send-renewal-reminders" in task_names

    def test_check_quota_exhaustion_is_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "check-quota-exhaustion" in task_names

    def test_auto_assign_tasks_is_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "auto-assign-tasks" in task_names

    def test_generate_content_calendar_is_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "generate-content-calendar" in task_names

    def test_all_automation_tasks_are_callable(self):
        from workers.automation_tasks import (
            auto_assign_tasks,
            check_quota_exhaustion,
            check_sla_breaches,
            generate_content_calendar,
            send_renewal_reminders,
        )

        assert callable(check_sla_breaches)
        assert callable(send_renewal_reminders)
        assert callable(check_quota_exhaustion)
        assert callable(auto_assign_tasks)
        assert callable(generate_content_calendar)

    def test_report_tasks_still_registered(self):
        from workers.celery_app import celery_app

        task_names = [name for name in celery_app.conf.beat_schedule]
        assert "generate-weekly-report" in task_names
        assert "generate-monthly-report" in task_names
        assert "generate-financial-report" in task_names


# ---------------------------------------------------------------------------
# Task 9.18 — WhatsApp service tests
# ---------------------------------------------------------------------------


class TestWhatsAppService:
    """Verify WhatsApp service function signatures."""

    def test_send_whatsapp_message_signature(self):
        from services.whatsapp import send_whatsapp_message

        sig = inspect.signature(send_whatsapp_message)
        params = list(sig.parameters.keys())
        assert "phone_number" in params
        assert "template_id" in params
        assert "parameters" in params
        assert "country_code" in params

    def test_send_otp_sms_signature(self):
        from services.whatsapp import send_otp_sms

        sig = inspect.signature(send_otp_sms)
        params = list(sig.parameters.keys())
        assert "phone_number" in params
        assert "otp" in params
        assert "country_code" in params


# ---------------------------------------------------------------------------
# Task 9.19 — Email service tests
# ---------------------------------------------------------------------------


class TestEmailService:
    """Verify Email service function signatures."""

    def test_send_email_signature(self):
        from services.email import send_email

        sig = inspect.signature(send_email)
        params = list(sig.parameters.keys())
        assert "to_email" in params
        assert "subject" in params
        assert "html_content" in params
        assert "from_email" in params

    def test_send_email_is_async(self):
        from services.email import send_email

        assert inspect.iscoroutinefunction(send_email)

    def test_from_email_default(self):
        from services.email import FROM_EMAIL

        assert isinstance(FROM_EMAIL, str)
        assert "@" in FROM_EMAIL or FROM_EMAIL == ""


# ---------------------------------------------------------------------------
# Task 9.20 — Instagram publishing service tests
# ---------------------------------------------------------------------------


class TestInstagramService:
    """Verify Instagram service function signatures."""

    def test_publish_media_signature(self):
        from services.instagram import publish_media

        sig = inspect.signature(publish_media)
        params = list(sig.parameters.keys())
        assert "ig_user_id" in params
        assert "access_token" in params
        assert "image_url" in params
        assert "caption" in params

    def test_publish_media_is_async(self):
        from services.instagram import publish_media

        assert inspect.iscoroutinefunction(publish_media)

    def test_refresh_access_token_signature(self):
        from services.instagram import refresh_access_token

        sig = inspect.signature(refresh_access_token)
        params = list(sig.parameters.keys())
        assert "current_token" in params

    def test_refresh_access_token_is_async(self):
        from services.instagram import refresh_access_token

        assert inspect.iscoroutinefunction(refresh_access_token)

    def test_exchange_instagram_token_signature(self):
        from services.instagram import exchange_instagram_token

        sig = inspect.signature(exchange_instagram_token)
        params = list(sig.parameters.keys())
        assert "code" in params
        assert "redirect_uri" in params

    def test_exchange_instagram_token_is_async(self):
        from services.instagram import exchange_instagram_token

        assert inspect.iscoroutinefunction(exchange_instagram_token)


# ---------------------------------------------------------------------------
# Automation task signature tests
# ---------------------------------------------------------------------------


class TestAutomationTaskSignatures:
    """Verify internal async helper function signatures."""

    def test_check_sla_breaches_async_signature(self):
        from workers.automation_tasks import _check_sla_breaches_async

        assert inspect.iscoroutinefunction(_check_sla_breaches_async)

    def test_send_renewal_reminders_async_signature(self):
        from workers.automation_tasks import _send_renewal_reminders_async

        assert inspect.iscoroutinefunction(_send_renewal_reminders_async)

    def test_check_quota_exhaustion_async_signature(self):
        from workers.automation_tasks import _check_quota_exhaustion_async

        assert inspect.iscoroutinefunction(_check_quota_exhaustion_async)

    def test_auto_assign_tasks_async_signature(self):
        from workers.automation_tasks import _auto_assign_tasks_async

        assert inspect.iscoroutinefunction(_auto_assign_tasks_async)

    def test_generate_content_calendar_async_signature(self):
        from workers.automation_tasks import _generate_content_calendar_async

        assert inspect.iscoroutinefunction(_generate_content_calendar_async)

    def test_run_async_helper_exists(self):
        from workers.automation_tasks import _run_async

        assert callable(_run_async)


class TestDifyAIIntegration:
    def test_call_dify_ai_analysis_success(self, monkeypatch):
        import json
        from unittest.mock import MagicMock
        from services.ai_analysis import call_dify_ai_analysis

        mock_answer = json.dumps({
            "brand_tone": ["Bold", "Professional"],
            "content_themes": ["Behind the scenes"],
            "audience_persona": "Tech savvy users",
            "goal_alignment": "Aligns with engagement",
            "ai_summary_line": "Bold voice, targeting tech users, focused on engagement"
        })

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "answer": f"```json\n{mock_answer}\n```",
            "metadata": {"usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}}
        }

        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_response

        monkeypatch.setattr("httpx.Client", lambda timeout=60.0: mock_client)
        monkeypatch.setattr("core.config.settings.DIFY_API_KEY", "test-dify-key")

        res = call_dify_ai_analysis("sys", "user")
        assert "analysis" in res
        assert res["analysis"]["ai_summary_line"] == "Bold voice, targeting tech users, focused on engagement"
        assert res["total_tokens"] == 30

