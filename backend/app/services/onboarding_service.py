"""Onboarding lifecycle service.

Enforces derived stage progression exclusively queried from v_client_onboarding.
Never reads a stored column for stage, never accepts a stage from the request body.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, NotFound, PaymentRequired
from app.models.enums import UserRole
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile, User
from app.models.work import ClientAssignment
from app.schemas.onboarding import (
    OnboardingCompleteResponse,
    OnboardingStatusResponse,
    QuestionnaireSubmitRequest,
)

STAGE_NAMES = {
    0: "Account Registered",
    1: "Account Verified",
    2: "Terms Accepted",
    3: "Subscription Active",
    4: "Questionnaire Submitted",
    5: "Onboarding Complete",
}


async def get_current_stage(db: AsyncSession, client_id: uuid.UUID) -> int:
    """Derive client onboarding stage (0..5) directly from v_client_onboarding."""
    stmt = text("SELECT stage FROM v_client_onboarding WHERE client_id = :uid")
    result = await db.execute(stmt, {"uid": client_id})
    row = result.fetchone()
    if not row:
        # Verify if user exists at all
        user_res = await db.execute(select(User).where(User.id == client_id))
        if not user_res.scalar_one_or_none():
            raise NotFound("Client account not found", code="CLIENT_NOT_FOUND")
        return 0
    return int(row[0])


async def get_onboarding_status(db: AsyncSession, client_id: uuid.UUID) -> OnboardingStatusResponse:
    """Return full onboarding status, progress flags, and deadline."""
    stage = await get_current_stage(db, client_id)

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()

    checklist = {
        "email_verified": stage >= 1,
        "terms_accepted": stage >= 2,
        "subscription_active": stage >= 3,
        "questionnaire_submitted": stage >= 4,
        "onboarding_completed": stage >= 5,
    }

    assigned_team: list[dict[str, Any]] = []
    if stage >= 4:
        ca_stmt = (
            select(ClientAssignment, User)
            .join(User, User.id == ClientAssignment.user_id)
            .where(ClientAssignment.client_id == client_id)
        )
        ca_res = await db.execute(ca_stmt)
        for ca, u in ca_res.all():
            role_label = "Team Member"
            if ca.role == "team_lead":
                role_label = "Team Lead & Account Director"
            elif ca.role == "video_editor":
                role_label = "Lead Video Editor (Reels & Motion)"
            elif ca.role == "graphic_designer":
                role_label = "Lead Graphic Designer (Posters & Carousels)"
            assigned_team.append({
                "id": str(u.id),
                "name": u.full_name or u.email,
                "role": role_label,
            })

    return OnboardingStatusResponse(
        client_id=client_id,
        stage=stage,
        stage_name=STAGE_NAMES.get(stage, "Unknown Stage"),
        checklist=checklist,
        deadline=profile.onboarding_deadline if profile else None,
        company_name=profile.company_name if profile else None,
        instagram_username=profile.instagram_username if profile else None,
        assigned_team=assigned_team,
    )



async def accept_terms(db: AsyncSession, client_id: uuid.UUID, terms_version: str) -> None:
    """Record acceptance of the Master Service Agreement."""
    stage = await get_current_stage(db, client_id)
    if stage < 1:
        raise Conflict(
            "Account must be verified before terms can be accepted",
            code="INVALID_STAGE",
        )

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()

    now = datetime.now(UTC)
    if not profile:
        profile = ClientProfile(
            user_id=client_id,
            terms_accepted_at=now,
            terms_version=terms_version,
        )
        db.add(profile)
    else:
        profile.terms_accepted_at = now
        profile.terms_version = terms_version

    await db.commit()


async def submit_questionnaire(
    db: AsyncSession, client_id: uuid.UUID, data: QuestionnaireSubmitRequest
) -> Questionnaire:
    """Persist client questionnaire. Guard strictly on stage >= 3 (Payment Required)."""
    stage = await get_current_stage(db, client_id)
    if stage < 3:
        raise PaymentRequired(
            "Active or trialing subscription is required before submitting the brand questionnaire",
            code="PAYMENT_REQUIRED",
            details={"current_stage": stage, "required_stage": 3},
        )

    # Upsert questionnaire
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    q_res = await db.execute(q_stmt)
    quest = q_res.scalar_one_or_none()

    now = datetime.now(UTC)
    payload = data.model_dump()

    if not quest:
        quest = Questionnaire(
            id=uuid.uuid4(),
            user_id=client_id,
            answers=payload,
            submitted_at=now,
        )
        db.add(quest)
    else:
        quest.answers = payload
        quest.submitted_at = now

    # Update profile fields and finalize onboarding
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()
    if profile:
        profile.company_name = data.company_name
        profile.instagram_username = data.instagram_username
        if not profile.onboarding_completed_at:
            profile.onboarding_completed_at = now
            profile.onboarding_deadline = now + timedelta(days=7)

    await db.commit()
    await db.refresh(quest)
    return quest


async def complete_onboarding(db: AsyncSession, client_id: uuid.UUID) -> OnboardingCompleteResponse:
    """Finalize client onboarding, assign account manager pod, and set initial SLA window."""
    stage = await get_current_stage(db, client_id)
    if stage < 4:
        raise Conflict(
            "Brand questionnaire must be submitted before completing onboarding",
            code="INCOMPLETE_ONBOARDING",
            details={"current_stage": stage, "required_stage": 4},
        )

    now = datetime.now(UTC)
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one()

    profile.onboarding_completed_at = now
    profile.onboarding_deadline = now + timedelta(days=7)
    await db.flush()

    # Impartial Pod Assignment & Feasible Calendar Generation
    from app.services.fair_dispatch_service import assign_client_and_generate_schedule
    dispatch_result = await assign_client_and_generate_schedule(db, client_id)

    assigned_team = []
    if dispatch_result.get("team_lead"):
        assigned_team.append({
            "id": dispatch_result["team_lead"]["id"],
            "name": dispatch_result["team_lead"]["name"],
            "role": "Team Lead & Account Director",
        })
    if dispatch_result.get("video_editor") and dispatch_result["video_editor"].get("id"):
        assigned_team.append({
            "id": dispatch_result["video_editor"]["id"],
            "name": dispatch_result["video_editor"]["name"],
            "role": "Lead Video Editor (Reels & Motion)",
        })
    if dispatch_result.get("graphic_designer") and dispatch_result["graphic_designer"].get("id"):
        assigned_team.append({
            "id": dispatch_result["graphic_designer"]["id"],
            "name": dispatch_result["graphic_designer"]["name"],
            "role": "Lead Graphic Designer (Posters & Carousels)",
        })

    await db.commit()
    return OnboardingCompleteResponse(
        status="completed",
        onboarding_completed_at=now,
        assigned_team=assigned_team,
    )

