"""Unit tests for chat messaging schema and router integrity."""

import uuid
from app.routers.chat import SendMessageRequest, _is_staff_channel


def test_send_message_request_validation() -> None:
    req = SendMessageRequest(
        channel="general",
        message="Hello team!",
    )
    assert req.channel == "general"
    assert req.message == "Hello team!"
    assert req.recipient_id is None

    dm_target = uuid.uuid4()
    dm_req = SendMessageRequest(
        recipient_id=dm_target,
        message="Hey there!",
        thread_type="direct",
    )
    assert dm_req.recipient_id == dm_target
    assert dm_req.message == "Hey there!"


def test_is_staff_channel() -> None:
    assert _is_staff_channel("general") is True
    assert _is_staff_channel("deliverables-handoff") is True
    assert _is_staff_channel("urgent-escalations") is True
    assert _is_staff_channel("pod-alpha-team") is True
    assert _is_staff_channel("client-123") is False
    assert _is_staff_channel("pod-creative-hub") is False
    assert _is_staff_channel(None) is False


def test_user_role_filters_use_only_enum_values() -> None:
    # Postgres rejects labels missing from the user_role enum (e.g. "lead"),
    # which made GET /chat/contacts return 500 for admins.
    import re
    from pathlib import Path
    from app.models.enums import UserRole

    source = (Path(__file__).parents[1] / "app/routers/chat.py").read_text()
    valid = {r.value for r in UserRole}
    for args in re.findall(r"User\.role\.in_\(\[([^\]]*)\]", source):
        for literal in re.findall(r'"([^"]+)"', args):
            assert literal in valid, f"{literal!r} is not a user_role enum value"
    assert "tm_roles = [UserRole.EDITOR, UserRole.DESIGNER]" in source
