"""Test suite for Client Onboarding Summary & Brand DNA dispatch to assigned creative pod handlers."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AccountStatus, UserRole
from app.models.ops import Notification
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile, User
from app.models.work import ClientAssignment
from app.services.onboarding_service import (
    complete_onboarding,
    notify_team_of_new_client_summary,
)


@pytest.mark.asyncio
async def test_notify_team_of_new_client_summary(db_session: AsyncSession) -> None:
    """Verify that notify_team_of_new_client_summary creates Notification records and dispatches brief emails."""
    # 1. Setup client
    client_id = uuid.uuid4()
    client = User(
        id=client_id,
        auth_id=f"auth-client-{client_id.hex[:6]}",
        email=f"client-{client_id.hex[:6]}@example.com",
        full_name="Acme Health & Fitness",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)

    profile = ClientProfile(
        user_id=client_id,
        company_name="Acme Health",
        instagram_username="acmehealth",
        brand_summary="High-potency organic fitness supplements for performance athletes.",
        brand_dna={
            "summary_line": "High-potency organic fitness supplements for performance athletes.",
            "positioning": "Empowering endurance athletes with transparent, science-backed nutrition.",
            "tone": {
                "humour": 3,
                "formality": 4,
                "respectfulness": 8,
                "energy": 9,
                "voice_words": ["authoritative", "energizing", "transparent"],
                "anti_voice_words": ["gimmicky", "slangy"],
                "writing_rules": ["Use active voice", "Back every claim with clinical data"],
            },
            "audience_segments": [
                {
                    "name": "Competitive Marathoners",
                    "description": "Athletes training 5+ days a week looking for clean fuel.",
                    "core_pain_point": "Digestive distress from artificial sweeteners.",
                }
            ],
            "content_pillars": [
                {
                    "name": "Endurance Physiology & Science",
                    "funnel_stage": "authority",
                    "rationale": "Positions Acme as the clinical authority in endurance.",
                    "best_formats": ["reel", "carousel"],
                    "example_angles": ["Why electrolytes fail without sodium balance"],
                }
            ],
            "visual_direction": {
                "styles": ["clean_minimal", "high_contrast"],
                "primary_colors": ["#0D2137", "#2B7BC4"],
                "visual_avoid": ["neon green", "low-res graphics"],
            },
            "production": {
                "can_shoot_people": True,
                "founder_on_camera": True,
                "default_reel_style": "talking_head",
                "feasible_formats": ["reel", "carousel"],
                "infeasible_formats": ["animation"],
            },
            "do_not": [
                "Never sound gimmicky",
                "Never produce animation",
                "Never make unverified medical claims",
            ],
        },
    )
    db_session.add(profile)

    # 2. Setup team members: Team Lead and Video Editor
    tl_id = uuid.uuid4()
    tl_user = User(
        id=tl_id,
        auth_id=f"auth-tl-{tl_id.hex[:6]}",
        email=f"tl-{tl_id.hex[:6]}@creo.agency",
        full_name="Vikram Malhotra",
        role=UserRole.TEAM_LEAD,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(tl_user)

    editor_id = uuid.uuid4()
    editor_user = User(
        id=editor_id,
        auth_id=f"auth-ed-{editor_id.hex[:6]}",
        email=f"editor-{editor_id.hex[:6]}@creo.agency",
        full_name="Karthik Raja",
        role=UserRole.EDITOR,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(editor_user)

    # 3. Create ClientAssignment records
    db_session.add(ClientAssignment(client_id=client_id, user_id=tl_id, role="team_lead", is_primary=True))
    db_session.add(ClientAssignment(client_id=client_id, user_id=editor_id, role="video_editor", is_primary=False))
    await db_session.commit()

    # 4. Mock email service to verify payload
    with patch("app.services.onboarding_service.send_email", new_callable=AsyncMock) as mock_send_email:
        mock_send_email.return_value = True

        res = await notify_team_of_new_client_summary(db_session, client_id)
        assert res["notified"] == 2
        assert res["emails_sent"] == 2
        assert mock_send_email.call_count == 2

        # Check call arguments
        calls = mock_send_email.call_args_list
        emails = [c.kwargs["to_email"] for c in calls]
        assert tl_user.email in emails
        assert editor_user.email in emails

        # Verify email content contains Brand DNA highlights
        first_call_html = calls[0].kwargs["html_content"]
        assert "Acme Health" in first_call_html
        assert "Competitive Marathoners" in first_call_html
        assert "Endurance Physiology & Science" in first_call_html
        assert "#2B7BC4" in first_call_html

    # 5. Verify In-App Notifications persisted
    notifs = (
        await db_session.execute(
            select(Notification).where(Notification.user_id.in_([tl_id, editor_id]))
        )
    ).scalars().all()

    assert len(notifs) == 2
    assert all("Acme Health" in n.title for n in notifs)
    assert any("Team Lead" in n.message for n in notifs)
    assert any("Lead Video Editor" in n.message for n in notifs)


@pytest.mark.asyncio
async def test_resend_summary_endpoint(db_session: AsyncSession) -> None:
    """Verify that POST /api/v1/onboarding/resend-summary dispatches notifications and email."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.core.security import create_access_token

    client_id = uuid.uuid4()
    client = User(
        id=client_id,
        auth_id=f"auth-resend-{client_id.hex[:6]}",
        email=f"resend-{client_id.hex[:6]}@example.com",
        full_name="Resend Client Co",
        role=UserRole.CLIENT,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(client)

    profile = ClientProfile(
        user_id=client_id,
        company_name="Resend Client Co",
        instagram_username="resendco",
        brand_summary="Innovative AI automation software.",
        brand_dna={
            "summary_line": "Innovative AI automation software.",
            "positioning": "Automating busywork for modern teams.",
            "tone": {"voice_words": ["smart", "crisp"]},
            "content_pillars": [{"name": "Workflow Hacks", "funnel_stage": "reach"}],
        },
    )
    db_session.add(profile)

    tl_id = uuid.uuid4()
    tl_user = User(
        id=tl_id,
        auth_id=f"auth-tl2-{tl_id.hex[:6]}",
        email=f"tl2-{tl_id.hex[:6]}@creo.agency",
        full_name="Vikram Lead",
        role=UserRole.TEAM_LEAD,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(tl_user)
    db_session.add(ClientAssignment(client_id=client_id, user_id=tl_id, role="team_lead", is_primary=True))
    await db_session.commit()

    token = create_access_token(subject=client_id, role="client", email=client.email)

    with patch("app.services.onboarding_service.send_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/v1/onboarding/resend-summary",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["notified"] == 1
        assert data["emails_sent"] == 1

