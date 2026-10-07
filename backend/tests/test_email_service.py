import pytest
from unittest.mock import MagicMock, patch
from app.config import Settings
from app.services.email_service import _send_smtp_sync


def test_settings_smtp_configuration():
    """Verify SMTP configuration defaults and SSL/TLS auto-reconciliation."""
    # Default settings (port 465 with SSL enabled)
    s1 = Settings()
    assert s1.SMTP_PORT == 465
    assert s1.SMTP_USE_SSL is True
    assert s1.SMTP_USE_TLS is False
    assert s1.SMTP_HOST == "smtp.gmail.com"
    assert s1.SMTP_SERVER == "smtp.gmail.com"

    # Explicit port 587 without explicit SSL -> TLS enabled, SSL disabled
    s2 = Settings(SMTP_PORT=587)
    assert s2.SMTP_PORT == 587
    assert s2.SMTP_USE_SSL is False
    assert s2.SMTP_USE_TLS is True

    # Custom SMTP_HOST reconciles with SMTP_SERVER
    s3 = Settings(SMTP_HOST="custom.mail.com")
    assert s3.SMTP_HOST == "custom.mail.com"
    assert s3.SMTP_SERVER == "custom.mail.com"

    # Explicit SMTP_USE_SSL flag
    s4 = Settings(SMTP_PORT=587, SMTP_USE_SSL=True)
    assert s4.SMTP_USE_SSL is True
    assert s4.SMTP_USE_TLS is False


def test_smtp_send_missing_credentials():
    """Verify that _send_smtp_sync returns False when credentials are not configured."""
    with patch("app.services.email_service.settings") as mock_settings:
        mock_settings.SMTP_USERNAME = ""
        mock_settings.SMTP_PASSWORD = ""
        mock_settings.SMTP_FROM_EMAIL = ""
        result = _send_smtp_sync("test@example.com", "Test Subject", "<p>Hello</p>")
        assert result is False


@patch("app.services.email_service.IPv4SMTP_SSL")
def test_smtp_send_ssl_flow(mock_ssl_class):
    """Verify that when SMTP_USE_SSL is True, SSL connection is used with timeout=10."""
    mock_server = MagicMock()
    mock_ssl_class.return_value = mock_server

    with patch("app.services.email_service.settings") as mock_settings:
        mock_settings.SMTP_USERNAME = "user@test.com"
        mock_settings.SMTP_PASSWORD = "secretpassword"
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 465
        mock_settings.SMTP_USE_SSL = True
        mock_settings.SMTP_FROM_EMAIL = "noreply@creo.agency"

        success = _send_smtp_sync("target@domain.com", "Subject", "<h1>Test</h1>")

        assert success is True
        mock_ssl_class.assert_called_once_with("smtp.gmail.com", 465, timeout=10)
        mock_server.login.assert_called_once_with("user@test.com", "secretpassword")
        assert mock_server.send_message.called
        mock_server.quit.assert_called_once()


@patch("app.services.email_service.IPv4SMTP")
def test_smtp_send_tls_flow(mock_smtp_class):
    """Verify that when SMTP_USE_SSL is False, STARTTLS flow is used with timeout=10."""
    mock_server = MagicMock()
    mock_smtp_class.return_value = mock_server

    with patch("app.services.email_service.settings") as mock_settings:
        mock_settings.SMTP_USERNAME = "user@test.com"
        mock_settings.SMTP_PASSWORD = "secretpassword"
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USE_SSL = False
        mock_settings.SMTP_USE_TLS = True
        mock_settings.SMTP_FROM_EMAIL = "noreply@creo.agency"

        success = _send_smtp_sync("target@domain.com", "Subject", "<h1>Test</h1>")

        assert success is True
        mock_smtp_class.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user@test.com", "secretpassword")
        assert mock_server.send_message.called
        mock_server.quit.assert_called_once()
