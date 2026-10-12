"""Unit tests for offline payment request and bypass logic."""

import uuid
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
