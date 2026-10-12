"""Unit tests for offline payment request and bypass logic."""

import uuid
import pytest
from app.schemas.onboarding import (
    ManualPaymentRequestCreate,
    ManualPaymentReviewRequest,
    DirectBypassRequest,
)


def test_manual_payment_schemas_validation() -> None:
    plan_id = uuid.uuid4()
    req = ManualPaymentRequestCreate(
        plan_id=plan_id,
        payment_method="cash",
        reference_note="Paid 50000 cash at office",
    )
    assert req.plan_id == plan_id
    assert req.payment_method == "cash"
    assert req.reference_note == "Paid 50000 cash at office"

    review = ManualPaymentReviewRequest(admin_notes="Verified by CEO")
    assert review.admin_notes == "Verified by CEO"

    direct = DirectBypassRequest(
        plan_id=plan_id,
        payment_method="bank_transfer",
        notes="Pre-paid enterprise contract",
    )
    assert direct.plan_id == plan_id
    assert direct.payment_method == "bank_transfer"
    assert direct.notes == "Pre-paid enterprise contract"


def test_payment_notification_emails_dispatched(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio
    from app.services import email_service

    captured: list[dict] = []

    async def fake_send_email(to_email: str, subject: str, html_content: str, text_content: str | None = None) -> bool:
        captured.append({
            "to_email": to_email,
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content,
        })
        return True

    monkeypatch.setattr(email_service, "send_email", fake_send_email)

    # 1. Verification request email to client
    ok = asyncio.run(
        email_service.send_payment_verification_request_email(
            "client@example.com", "Acme Corp", "Creo Scale", 50000.0, "cash", is_admin=False, notes="Handed cash"
        )
    )
    assert ok is True
    assert len(captured) == 1
    assert "Payment Verification Request Received" in captured[0]["subject"]
    assert "Acme Corp" in captured[0]["html_content"]

    # 2. Verification request email to admin
    ok = asyncio.run(
        email_service.send_payment_verification_request_email(
            "admin@creo.agency", "Acme Corp", "Creo Scale", 50000.0, "cash", is_admin=True, notes="Handed cash"
        )
    )
    assert ok is True
    assert len(captured) == 2
    assert "[Action Required]" in captured[1]["subject"]

    # 3. Approved email
    ok = asyncio.run(
        email_service.send_payment_approved_email(
            "client@example.com", "Acme Corp", "Creo Scale", 50000.0, admin_notes="Received by finance"
        )
    )
    assert ok is True
    assert len(captured) == 3
    assert "Payment Verified" in captured[2]["subject"]
    assert "step=4" in captured[2]["html_content"]

    # 4. Rejected email
    ok = asyncio.run(
        email_service.send_payment_rejected_email(
            "client@example.com", "Acme Corp", "Creo Scale", reason="Receipt not found"
        )
    )
    assert ok is True
    assert len(captured) == 4
    assert "Declined" in captured[3]["html_content"]


def test_manual_payment_notifications_valid() -> None:
    from app.models.ops import Notification

    client_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    # Admin alert
    admin_notif = Notification(
        user_id=admin_id,
        title="Offline Payment Verification Requested",
        message="Client requested offline payment verification (CASH) for Scale (₹1,00,000).",
        link="/admin/clients",
        is_read=False,
    )
    assert admin_notif.user_id == admin_id
    assert admin_notif.title == "Offline Payment Verification Requested"

    # Client alert
    client_notif = Notification(
        user_id=client_id,
        title="Offline Payment Verification Under Review",
        message="Your offline payment request has been received.",
        link="/onboarding?step=3",
        is_read=False,
    )
    assert client_notif.user_id == client_id
    assert client_notif.is_read is False

