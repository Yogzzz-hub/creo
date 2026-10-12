"""SMTP contracts without real email or network access."""
import asyncio
import smtplib
import ssl
from typing import Any

import pytest

from app.config import Settings, settings
from app.services import email_service


class FakeSMTP:
    events: list[str] = []
    message: Any = None
    refused: dict = {}
    login_error = False
    quit_error = False

    def __init__(self, host, port, **kwargs):
        assert host == "smtp-relay.brevo.com"
        if port == 465:
            assert isinstance(kwargs["context"], ssl.SSLContext)
        self.events.append("connect")

    def ehlo(self):
        self.events.append("ehlo")

    def starttls(self, *, context):
        assert context.verify_mode == ssl.CERT_REQUIRED
        assert context.check_hostname
        self.events.append("tls")

    def login(self, username, password):
        assert username == "test-login@smtp-brevo.com"
        assert password == "xsmtpsib-test-key"
        self.events.append("login")
        if self.login_error:
            raise smtplib.SMTPAuthenticationError(525, b"Unauthorized IP address")

    def send_message(self, message, *, from_addr, to_addrs):
        assert from_addr == "sender@example.com"
        assert to_addrs == ["client@example.net"]
        type(self).message = message
        self.events.append("send")
        return self.refused

    def quit(self):
        self.events.append("quit")
        if self.quit_error:
            raise smtplib.SMTPServerDisconnected("Connection closed")

    def close(self):
        self.events.append("close")


@pytest.fixture(autouse=True)
def smtp_config(monkeypatch):
    values = {
        "BREVO_API_KEY": "", "BREVO_FROM_EMAIL": "",
        "SMTP_SERVER": "smtp-relay.brevo.com", "SMTP_PORT": 2525,
        "SMTP_USERNAME": "test-login@smtp-brevo.com",
        "SMTP_PASSWORD": "xsmtpsib-test-key",
        "SMTP_FROM_EMAIL": "Creo <sender@example.com>",
        "SMTP_USE_TLS": True, "SMTP_USE_SSL": False,
    }
    for name, value in values.items():
        monkeypatch.setattr(settings, name, value)
    for name, value in {"events": [], "message": None, "refused": {},
                        "login_error": False, "quit_error": False}.items():
        monkeypatch.setattr(FakeSMTP, name, value)
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTP)


def send():
    return asyncio.run(email_service.send_email(
        "client@example.net", "Verification", "<p>Code</p>", "Code"
    ))


@pytest.mark.parametrize("port", [2525, 587])
def test_submission_ports_use_verified_tls_even_with_stale_ssl_flag(monkeypatch, port):
    monkeypatch.setattr(settings, "SMTP_PORT", port)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", True)
    assert send()
    assert FakeSMTP.events == ["connect", "ehlo", "tls", "ehlo", "login", "send", "quit"]
    assert FakeSMTP.message["From"] == "Creo <sender@example.com>"
    assert FakeSMTP.message.get_body(preferencelist=("plain",)).get_content().strip() == "Code"


def test_implicit_tls_port(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_PORT", 465)
    assert send()
    assert "tls" not in FakeSMTP.events


@pytest.mark.parametrize("sender", ["", "test-login@smtp-brevo.com"])
def test_sender_never_defaults_to_technical_login(monkeypatch, sender):
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", sender)
    assert not send()
    assert not FakeSMTP.events


def test_username_is_required_not_hardcoded(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_USERNAME", "")
    assert not send()
    assert not FakeSMTP.events


def test_ip_rejection_fails_and_closes_connection(monkeypatch):
    monkeypatch.setattr(FakeSMTP, "login_error", True)
    assert not send()
    assert "send" not in FakeSMTP.events
    assert FakeSMTP.events[-1] == "quit"


def test_refused_recipient_fails(monkeypatch):
    monkeypatch.setattr(FakeSMTP, "refused", {"client@example.net": (550, b"Rejected")})
    assert not send()


def test_disconnect_after_acceptance_does_not_report_failure(monkeypatch):
    monkeypatch.setattr(FakeSMTP, "quit_error", True)
    assert send()
    assert FakeSMTP.events[-1] == "close"
    assert FakeSMTP.events.count("send") == 1


def test_legacy_smtp_key_variable_is_supported(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xsmtpsib-test-key")
    assert send()


@pytest.mark.parametrize("recipient,subject", [
    ("client@example.net\nBcc: other@example.net", "Verify"),
    ("client@example.net", "Verify\r\nBcc: other@example.net"),
])
def test_header_injection_is_rejected(recipient, subject):
    assert not asyncio.run(email_service.send_email(recipient, subject, "Code"))
    assert not FakeSMTP.events


def test_2525_config_infers_starttls():
    config = Settings(_env_file=None, SMTP_PORT=2525, ENVIRONMENT="test")
    assert config.SMTP_USE_TLS is True
    assert config.SMTP_USE_SSL is False


def test_payment_template_escapes_user_content():
    assert asyncio.run(email_service.send_payment_rejected_email(
        "client@example.net", "<b>Client</b>", "<i>Plan</i>", "<a>Reason</a>"
    ))
    html = FakeSMTP.message.get_body(preferencelist=("html",)).get_content()
    text = FakeSMTP.message.get_body(preferencelist=("plain",)).get_content()
    assert "&lt;b&gt;Client&lt;/b&gt;" in html
    assert "&lt;i&gt;Plan&lt;/i&gt;" in html
    assert "&lt;a&gt;Reason&lt;/a&gt;" in html
    assert "<b>Client</b>" in text
