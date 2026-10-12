from datetime import UTC, datetime

from app.routers.portal_dashboard import (
    _CALL_TIMEZONE,
    _candidate_pod_call_slots,
    _format_call_slot,
)


def test_pod_call_slots_are_future_weekdays_in_ist():
    now = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)  # Monday evening in India.

    slots = _candidate_pod_call_slots(now, days=10)

    assert slots
    assert all(slot.tzinfo == _CALL_TIMEZONE for slot in slots)
    assert all(slot > now.astimezone(_CALL_TIMEZONE) for slot in slots)
    assert all(slot.weekday() < 5 for slot in slots)
    assert slots[0].isoformat() == "2026-10-13T14:00:00+05:30"


def test_pod_call_slot_labels_include_the_ist_time():
    slot = datetime(2026, 10, 13, 14, 0, tzinfo=_CALL_TIMEZONE)

    formatted = _format_call_slot(slot)

    assert formatted["id"] == slot.isoformat()
    assert formatted["starts_at"] == slot.isoformat()
    assert formatted["date_label"] == "Tue, Oct 13"
    assert formatted["time_label"] == "2:00 PM IST"
