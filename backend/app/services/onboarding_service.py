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


QUESTION_MAPPING_V1_TO_V2 = {
    "old Q1": "A3",
    "old Q2": "G1",
    "old Q3": "G2",
    "old Q4": "G4",
    "old Q5": "G3",
    "old Q6": "A5",
    "old Q7": "B3",
    "old Q8": "B3",
    "old Q9": "G2",
    "old Q10": "F4",
    "old Q11": "B1",
    "old Q12": "B3",
    "old Q13": "B4",
    "old Q14": "C5",
    "old Q15": "B5",
    "old Q16": "B5",
    "old Q17": ["C8", "D8"],
    "old Q18": ["C1", "C2", "C3", "C4", "C5", "C6", "D6"],
    "old Q19": ["C6", "C7", "D7", "E7"],
    "old Q20": "A6",
}


def map_legacy_answers_to_sections(answers: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Map legacy 20-question branding form answers to new 7-section schema per §4."""
    sec_a: dict[str, Any] = {
        "brand_name": answers.get("company_name", ""),
        "instagram_handle": answers.get("instagram_username", ""),
        "one_liner": answers.get("brand_description") or answers.get("q1") or "",
        "category": answers.get("industry") or answers.get("q4") or "other",
        "products": answers.get("core_offerings") or answers.get("q6") or [],
        "primary_goal": answers.get("primary_goal") or answers.get("q20") or "brand_awareness",
        "goal_notes": "",
    }
    sec_b: dict[str, Any] = {
        "ideal_customer": answers.get("target_audience") or answers.get("q11") or "",
        "problem": answers.get("q8") or answers.get("q12") or answers.get("q7") or "",
        "why_chosen": answers.get("differentiators") or answers.get("q7") or answers.get("q8") or answers.get("q12") or "",
        "objections": answers.get("q13") or answers.get("buyer_objections") or "",
        "competitors": answers.get("competitors") or answers.get("q15") or [],
        "languages": ["english"],
        "caption_script": "english_only",
        "locations": [],
    }
    sec_c: dict[str, Any] = {
        "humour": 4,
        "formality": 4,
        "respectfulness": 8,
        "energy": 7,
        "voice_words": answers.get("voice_tone") or answers.get("q14") or ["warm", "bold"],
        "anti_voice_words": ["corporate", "salesy"],
        "forbidden_phrases": answers.get("brand_taboos") or answers.get("q19") or "",
        "admired_brands": answers.get("q17") or [],
    }
    sec_d: dict[str, Any] = {
        "brand_guidelines": "none",
        "colours": answers.get("color_palette") or ["#0D2137", "#2B7BC4"],
        "fonts": "",
        "visual_direction": answers.get("q18") or ["clean_minimal"],
        "visual_avoid": answers.get("q19") or "",
        "reference_accounts": answers.get("q17") or [],
    }
    sec_e: dict[str, Any] = {
        "on_camera": ["founder"],
        "founder_comfort": "yes_confident",
        "shoot_locations": ["our_store_office"],
        "shoot_city": "Mumbai",
        "availability": ["weekday_morning"],
        "samples": "yes",
        "format_exclusions": [],
        "cta_destination": "website",
        "cta_target": "",
        "legal_constraints": "",
        "approval_speed": "founder_same_day",
    }
    sec_f: dict[str, Any] = {
        "best_posts": [],
        "worst_posts": [],
        "frequency": "weekly",
        "what_failed": answers.get("q10") or "",
    }
    sec_g: dict[str, Any] = {
        "origin": answers.get("q2") or "",
        "stands_for": answers.get("q3") or answers.get("q9") or "",
        "remembered_for": answers.get("q5") or "",
        "vision": answers.get("q4") or "",
    }
    return {
        "a": sec_a,
        "b": sec_b,
        "c": sec_c,
        "d": sec_d,
        "e": sec_e,
        "f": sec_f,
        "g": sec_g,
    }


async def save_questionnaire_section(
    db: AsyncSession,
    client_id: uuid.UUID,
    section: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Autosave an individual questionnaire section (a..g) and unlock core if sections A-E are complete."""
    sec = section.lower()
    if sec not in ["a", "b", "c", "d", "e", "f", "g"]:
        raise Conflict(f"Invalid section '{section}'. Expected one of a..g", code="INVALID_SECTION")

    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if not quest:
        quest = Questionnaire(
            id=uuid.uuid4(),
            user_id=client_id,
            section_a={},
            section_b={},
            section_c={},
            section_d={},
            section_e={},
            section_f={},
            section_g={},
            version=1,
        )
        db.add(quest)

    # Persist section data
    setattr(quest, f"section_{sec}", data)

    # Sync Section A details to ClientProfile
    if sec == "a":
        p_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
        profile = (await db.execute(p_stmt)).scalar_one_or_none()
        if profile:
            if data.get("brand_name"):
                profile.company_name = str(data["brand_name"])
            if data.get("instagram_handle"):
                profile.instagram_username = str(data["instagram_handle"])

    # Core unlock condition: check if Sections A-E have their essential fields
    has_a = bool(quest.section_a and (quest.section_a.get("brand_name") or quest.section_a.get("one_liner")))
    has_b = bool(quest.section_b and quest.section_b.get("ideal_customer"))
    has_c = bool(quest.section_c and ("humour" in quest.section_c or quest.section_c.get("voice_words")))
    has_d = bool(quest.section_d and (quest.section_d.get("visual_direction") or quest.section_d.get("colours")))
    has_e = bool(quest.section_e and quest.section_e.get("on_camera"))

    if has_a and has_b and has_c and has_d and has_e:
        if not quest.core_completed_at:
            quest.core_completed_at = now
            if not quest.submitted_at:
                quest.submitted_at = now

    # Extended completion check
    has_f = bool(quest.section_f and bool(quest.section_f))
    has_g = bool(quest.section_g and bool(quest.section_g))
    if quest.core_completed_at and has_f and has_g:
        if not quest.extended_completed_at:
            quest.extended_completed_at = now

    await db.commit()
    await db.refresh(quest)

    return {
        "client_id": str(client_id),
        "section_saved": sec,
        "core_completed": quest.core_completed_at is not None,
        "extended_completed": quest.extended_completed_at is not None,
        "version": quest.version,
    }


async def get_questionnaire_state(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> dict[str, Any]:
    """Retrieve full questionnaire state across all sections for restore on return."""
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    if not quest:
        return {
            "client_id": str(client_id),
            "section_a": {},
            "section_b": {},
            "section_c": {},
            "section_d": {},
            "section_e": {},
            "section_f": {},
            "section_g": {},
            "core_completed": False,
            "extended_completed": False,
            "version": 1,
        }

    return {
        "client_id": str(client_id),
        "section_a": quest.section_a or {},
        "section_b": quest.section_b or {},
        "section_c": quest.section_c or {},
        "section_d": quest.section_d or {},
        "section_e": quest.section_e or {},
        "section_f": quest.section_f or {},
        "section_g": quest.section_g or {},
        "core_completed": quest.core_completed_at is not None,
        "extended_completed": quest.extended_completed_at is not None,
        "version": quest.version or 1,
    }


async def submit_questionnaire(
    db: AsyncSession, client_id: uuid.UUID, data: QuestionnaireSubmitRequest
) -> Questionnaire:
    """Persist client questionnaire, map to 7 sections, and update client profile."""
    stage = await get_current_stage(db, client_id)
    if stage < 3:
        raise PaymentRequired(
            "Active subscription required before questionnaire submission",
            code="PAYMENT_REQUIRED",
        )

    # Upsert questionnaire
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    q_res = await db.execute(q_stmt)
    quest = q_res.scalar_one_or_none()

    now = datetime.now(UTC)
    payload = data.model_dump()
    mapped = map_legacy_answers_to_sections(payload)

    if not quest:
        quest = Questionnaire(
            id=uuid.uuid4(),
            user_id=client_id,
            answers=payload,
            submitted_at=now,
            core_completed_at=now,
            section_a=mapped["a"],
            section_b=mapped["b"],
            section_c=mapped["c"],
            section_d=mapped["d"],
            section_e=mapped["e"],
            section_f=mapped["f"],
            section_g=mapped["g"],
            version=1,
        )
        db.add(quest)
    else:
        quest.answers = payload
        quest.submitted_at = now
        if not quest.core_completed_at:
            quest.core_completed_at = now
        if not quest.section_a:
            quest.section_a = mapped["a"]
        if not quest.section_b:
            quest.section_b = mapped["b"]
        if not quest.section_c:
            quest.section_c = mapped["c"]
        if not quest.section_d:
            quest.section_d = mapped["d"]
        if not quest.section_e:
            quest.section_e = mapped["e"]
        if not quest.section_f:
            quest.section_f = mapped["f"]
        if not quest.section_g:
            quest.section_g = mapped["g"]

    # Update profile fields and finalize onboarding
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()
    if profile:
        profile.company_name = data.company_name
        profile.instagram_username = data.instagram_username
        if not profile.onboarding_deadline:
            profile.onboarding_deadline = now + timedelta(days=7)

    await db.commit()
    await db.refresh(quest)
    return quest


async def complete_onboarding(db: AsyncSession, client_id: uuid.UUID) -> OnboardingCompleteResponse:
    """Finalize client onboarding, assign account manager pod, and set initial SLA window."""
    now = datetime.now(UTC)
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one()

    # Idempotent check: if already completed, return existing assignment
    if profile.onboarding_completed_at is not None:
        ca_stmt = (
            select(ClientAssignment, User)
            .join(User, User.id == ClientAssignment.user_id)
            .where(ClientAssignment.client_id == client_id)
        )
        ca_res = await db.execute(ca_stmt)
        existing_rows = ca_res.all()
        if existing_rows:
            assigned_team = []
            for ca, u in existing_rows:
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
            return OnboardingCompleteResponse(
                status="completed",
                onboarding_completed_at=profile.onboarding_completed_at,
                assigned_team=assigned_team,
            )

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

