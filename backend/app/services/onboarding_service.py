"""Onboarding lifecycle service.

Enforces derived stage progression exclusively queried from v_client_onboarding.
Never reads a stored column for stage, never accepts a stage from the request body.
"""

from __future__ import annotations

import asyncio
import html
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import Conflict, NotFound, PaymentRequired
from app.core.logging import get_logger
from app.models.enums import UserRole
from app.models.ops import Notification
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile, User
from app.models.work import ClientAssignment, ContentCalendar
from app.schemas.onboarding import (
    OnboardingCompleteResponse,
    OnboardingStatusResponse,
    QuestionnaireSubmitRequest,
)
from app.services.email_service import send_email

logger = get_logger(__name__)

STAGE_NAMES = {
    0: "Account Registered",
    1: "Account Verified",
    2: "Terms Accepted",
    3: "Subscription Active",
    4: "Questionnaire Submitted",
    5: "Brand DNA Generated",
    6: "Creative Pod Allocated",
    7: "Content Calendar Generated",
    8: "Onboarding Complete",
}


def core_sections_complete(sections: dict[str, dict[str, Any]]) -> bool:
    a, b, c, d, e = (sections.get(key) or {} for key in "abcde")
    camera_answered = e.get("on_camera") is False or bool(e.get("on_camera"))
    return bool(
        (a.get("brand_name") or a.get("one_liner"))
        and b.get("ideal_customer")
        and (("humour" in c and c["humour"] is not None) or c.get("voice_words"))
        and (d.get("visual_direction") or d.get("colours"))
        and (camera_answered or e.get("shoot_locations"))
    )


def _questionnaire_core_complete(quest: Questionnaire) -> bool:
    return core_sections_complete({key: getattr(quest, f"section_{key}") or {} for key in "abcde"})


def get_first_incomplete_section(quest: Questionnaire | None) -> str:
    """Identify the first incomplete section among mandatory core sections A to E."""
    if not quest:
        return "a"
    sec_a = quest.section_a or {}
    if not (sec_a.get("brand_name") or sec_a.get("one_liner")):
        return "a"
    sec_b = quest.section_b or {}
    if not sec_b.get("ideal_customer"):
        return "b"
    sec_c = quest.section_c or {}
    if not ("humour" in sec_c or sec_c.get("voice_words")):
        return "c"
    sec_d = quest.section_d or {}
    if not (sec_d.get("visual_direction") or sec_d.get("colours")):
        return "d"
    sec_e = quest.section_e or {}
    if not (sec_e.get("on_camera") is False or sec_e.get("on_camera") or sec_e.get("shoot_locations")):
        return "e"
    # If core A-E are all filled, check if client was on an active section
    ans = quest.answers or {}
    last_sec = ans.get("last_active_section")
    if last_sec and last_sec in ("a", "b", "c", "d", "e", "f", "g"):
        return last_sec
    sec_f = quest.section_f or {}
    if not sec_f:
        return "f"
    return "g"


async def get_current_stage(db: AsyncSession, client_id: uuid.UUID) -> int:
    """Derive client onboarding stage (0..8) directly from v_client_onboarding."""
    result = await db.execute(text("""
        SELECT CASE
          WHEN COALESCE(v.stage, 0) < 4 THEN COALESCE(v.stage, 0)
          WHEN p.brand_dna IS NULL OR p.brand_dna = '{}'::jsonb THEN 4
          WHEN NOT EXISTS (SELECT 1 FROM client_assignments a WHERE a.client_id = u.id) THEN 5
          WHEN NOT EXISTS (SELECT 1 FROM content_calendar c WHERE c.client_id = u.id) THEN 6
          WHEN p.onboarding_completed_at IS NULL THEN 7
          ELSE 8 END
        FROM users u
        LEFT JOIN v_client_onboarding v ON v.client_id = u.id
        LEFT JOIN client_profiles p ON p.user_id = u.id
        WHERE u.id = :uid
    """), {"uid": client_id})
    row = result.fetchone()
    if row is None:
        raise NotFound("Client account not found", code="CLIENT_NOT_FOUND")
    return int(row[0])


async def get_onboarding_status(db: AsyncSession, client_id: uuid.UUID, *, known_stage: int | None = None) -> OnboardingStatusResponse:
    """Return full onboarding status, progress flags, and deadline."""
    stage = known_stage if known_stage is not None else await get_current_stage(db, client_id)

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()

    is_complete = stage >= 8

    # Derive resume section and next required stage & route
    resume_section = None
    if stage == 0:
        next_required = "verify"
        next_route = "/onboarding?step=1"
        last_stage_name = None
    elif stage == 1:
        next_required = "terms"
        next_route = "/onboarding?step=2"
        last_stage_name = STAGE_NAMES[1]
    elif stage == 2:
        next_required = "payment"
        next_route = "/onboarding?step=3"
        last_stage_name = STAGE_NAMES[2]
    elif stage == 3:
        next_required = "questionnaire"
        q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
        quest = (await db.execute(q_stmt)).scalar_one_or_none()
        ans = (quest.answers or {}) if quest else {}
        server_last = ans.get("last_active_section")
        if server_last and server_last in ("a", "b", "c", "d", "e", "f", "g"):
            resume_section = server_last
        else:
            resume_section = get_first_incomplete_section(quest)
        next_route = "/onboarding/questionnaire"
        last_stage_name = STAGE_NAMES[3]
    elif stage == 4:
        next_required = "brand_dna"
        q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
        quest = (await db.execute(q_stmt)).scalar_one_or_none()
        ans = (quest.answers or {}) if quest else {}
        server_last = ans.get("last_active_section")
        if server_last and server_last in ("a", "b", "c", "d", "e", "f", "g"):
            resume_section = server_last
        else:
            resume_section = "g"
        next_route = "/onboarding/questionnaire?step=brand_dna"
        last_stage_name = STAGE_NAMES[4]
    elif stage == 5:
        next_required = "pod"
        next_route = "/onboarding/questionnaire?step=pod"
        last_stage_name = STAGE_NAMES[5]
    elif stage == 6:
        next_required = "calendar"
        next_route = "/onboarding/questionnaire?step=calendar"
        last_stage_name = STAGE_NAMES[6]
    elif stage == 7:
        next_required = "complete"
        next_route = "/onboarding?step=5"
        last_stage_name = STAGE_NAMES[7]
    else:
        next_required = "portal"
        next_route = "/portal"
        last_stage_name = STAGE_NAMES[8]

    checklist = {
        "email_verified": stage >= 1,
        "terms_accepted": stage >= 2,
        "subscription_active": stage >= 3,
        "questionnaire_submitted": stage >= 4,
        "brand_dna_generated": stage >= 5,
        "pod_assigned": stage >= 6,
        "calendar_generated": stage >= 7,
        "onboarding_completed": is_complete,
    }

    assigned_team: list[dict[str, Any]] = []
    if stage >= 6:
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
        is_complete=is_complete,
        next_required_stage=next_required,
        next_route=next_route,
        resume_section=resume_section,
        last_completed_stage_name=last_stage_name,
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


async def save_questionnaire_sections(
    db: AsyncSession,
    client_id: uuid.UUID,
    sections: dict[str, dict[str, Any]],
    active_section: str | None = None,
) -> dict[str, Any]:
    """Persist a questionnaire snapshot in one transaction, including optional F/G."""
    if not sections or any(key not in "abcdefg" or len(key) != 1 for key in sections):
        raise Conflict("Expected questionnaire sections a..g", code="INVALID_SECTION")
    # Serialize saves from multiple tabs, including the first questionnaire insert.
    user = (await db.execute(select(User).where(User.id == client_id).with_for_update())).scalar_one_or_none()
    if not user:
        raise NotFound("Client account not found", code="CLIENT_NOT_FOUND")
    quest = (await db.execute(select(Questionnaire).where(Questionnaire.user_id == client_id))).scalar_one_or_none()
    now = datetime.now(UTC)
    if not quest:
        quest = Questionnaire(
            id=uuid.uuid4(), user_id=client_id, agency_id=user.agency_id,
            **{f"section_{key}": {} for key in "abcdefg"}, version=0,
        )
        db.add(quest)
    changed = False
    for key, data in sections.items():
        if getattr(quest, f"section_{key}") != data:
            setattr(quest, f"section_{key}", data)
            changed = True
    if changed:
        quest.version = (quest.version or 0) + 1
    if "a" in sections:
        profile = (await db.execute(select(ClientProfile).where(ClientProfile.user_id == client_id))).scalar_one_or_none()
        if profile:
            identity = sections["a"]
            if identity.get("brand_name"):
                profile.company_name = str(identity["brand_name"])
            if identity.get("instagram_handle"):
                profile.instagram_username = str(identity["instagram_handle"])
    core_complete = _questionnaire_core_complete(quest)
    quest.core_completed_at = (quest.core_completed_at or now) if core_complete else None
    if core_complete and not quest.submitted_at:
        quest.submitted_at = now
    quest.extended_completed_at = (
        (quest.extended_completed_at or now)
        if core_complete and quest.section_f and quest.section_g else None
    )
    quest.answers = {**(quest.answers or {}), "last_active_section": active_section or next(reversed(sections))}
    await db.commit()
    return {
        "client_id": str(client_id), "sections_saved": list(sections),
        "core_completed": core_complete,
        "extended_completed": quest.extended_completed_at is not None,
        "version": quest.version,
    }


async def save_questionnaire_section(
    db: AsyncSession, client_id: uuid.UUID, section: str, data: dict[str, Any],
) -> dict[str, Any]:
    result = await save_questionnaire_sections(db, client_id, {section.lower(): data}, section.lower())
    return {**result, "section_saved": section.lower()}


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
        "last_active_section": (quest.answers or {}).get("last_active_section"),
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
    if not core_sections_complete(mapped):
        raise Conflict("Mandatory Brand Questionnaire Sections A-E are incomplete", code="QUESTIONNAIRE_REQUIRED")

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
    """Finalize client onboarding with strict prerequisite validation.
    
    Order: Terms -> Active Sub -> Sections A-E -> Brand DNA -> Pod Assignment -> Calendar Generation -> Complete.
    """
    now = datetime.now(UTC)
    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()
    if not profile:
        raise NotFound("Client profile not found", code="CLIENT_NOT_FOUND")

    # Idempotent check: if already completed, return existing assignment
    if profile.onboarding_completed_at is not None:
        # Revalidate persisted creative roles so retrying completion can repair
        # legacy admin fallbacks rather than reporting an ineligible pod as ready.
        from app.services.dispatch_engine import assign_pod
        await assign_pod(db, client_id)
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
            quest = (await db.execute(select(Questionnaire).where(Questionnaire.user_id == client_id))).scalar_one_or_none()
            if quest:
                quest.answers = {**(quest.answers or {}), "brand_requested_version": quest.version}
                await db.commit()
            schedule_brand_enrichment(client_id)
            schedule_client_dispatch(client_id)
            return OnboardingCompleteResponse(
                status="completed",
                onboarding_completed_at=profile.onboarding_completed_at,
                assigned_team=assigned_team,
            )

    # Prerequisite 1: Terms accepted
    if not profile.terms_accepted_at:
        raise Conflict("Terms must be accepted before completing onboarding", code="TERMS_REQUIRED")

    # Prerequisite 2: Active subscription exists
    from app.services.subscription_guard import check_client_subscription
    sub_check = await check_client_subscription(db, client_id)
    if not sub_check["is_active"]:
        raise PaymentRequired("Active subscription required before completing onboarding", code="PAYMENT_REQUIRED")

    # Prerequisite 3: Questionnaire Sections A-E completed
    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()
    if quest:
        if not _questionnaire_core_complete(quest) and quest.answers:
            mapped = map_legacy_answers_to_sections(quest.answers)
            for sec_k in "abcdefg":
                if not getattr(quest, f"section_{sec_k}"):
                    setattr(quest, f"section_{sec_k}", mapped[sec_k])
        if _questionnaire_core_complete(quest):
            quest.core_completed_at = quest.core_completed_at or now
            if not quest.submitted_at:
                quest.submitted_at = now
            await db.commit()
            await db.refresh(quest)
        else:
            raise Conflict("Mandatory Brand Questionnaire Sections A-E must be submitted before completing onboarding", code="QUESTIONNAIRE_REQUIRED")
    else:
        raise Conflict("Mandatory Brand Questionnaire Sections A-E must be submitted before completing onboarding", code="QUESTIONNAIRE_REQUIRED")

    # Prerequisite 4: Brand DNA. Use the instant deterministic version so the client never
    # waits on an LLM; Gemini upgrades it in the background once the pod is assigned.
    if not profile.brand_dna:
        from app.services.brand_dna import save_template_brand_dna
        await save_template_brand_dna(db, client_id)
        await db.refresh(profile)

    # Prerequisite 5 & 6: Impartial Pod Assignment & Feasible Calendar Generation
    from app.services.fair_dispatch_service import assign_client_and_generate_schedule
    dispatch_result = await assign_client_and_generate_schedule(db, client_id)

    # Verify both pod and calendar exist
    ca_count = (await db.execute(select(func.count(ClientAssignment.id)).where(ClientAssignment.client_id == client_id))).scalar() or 0
    cc_count = (await db.execute(select(func.count(ContentCalendar.id)).where(ContentCalendar.client_id == client_id))).scalar() or 0
    if ca_count == 0:
        raise Conflict("Pod allocation failed. Assignment could not be confirmed.", code="POD_ALLOCATION_FAILED")
    if cc_count == 0:
        raise Conflict("Content calendar generation failed. Schedule could not be confirmed.", code="CALENDAR_GENERATION_FAILED")

    # Persist the requested version so the worker can recover enrichment after a restart.
    quest.answers = {**(quest.answers or {}), "brand_requested_version": quest.version}

    # Only after all prerequisites succeed:
    profile.onboarding_completed_at = now
    if not profile.onboarding_deadline:
        profile.onboarding_deadline = now + timedelta(days=7)

    # Set user account to active
    user_stmt = select(User).where(User.id == client_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user:
        user.account_status = "active"

    # Initialize monthly usage counters for the sprint
    from app.services.quota_service import initialize_quotas_for_client
    await initialize_quotas_for_client(db, client_id)

    await db.commit()
    await db.refresh(profile)

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

    # After the response: Gemini summarises the questionnaire (Brand DNA + team brief with pod
    # alignment), then the team lead and specialists get the brief in-app and by email.
    schedule_brand_enrichment(client_id)
    schedule_client_dispatch(client_id)

    return OnboardingCompleteResponse(
        status="completed",
        onboarding_completed_at=now,
        assigned_team=assigned_team,
    )


_background_tasks: set[asyncio.Task[None]] = set()
_enrichment_tasks: dict[uuid.UUID, asyncio.Task[None]] = {}


async def _dispatch_client_in_background(client_id: uuid.UUID) -> None:
    from app.db.session import AsyncSessionLocal
    from app.services.dispatch_engine import assign_upcoming_window
    try:
        async with AsyncSessionLocal() as db:
            await assign_upcoming_window(db, client_id=client_id)
    except Exception as err:
        logger.error("client_dispatch_deferred_to_sweep", client_id=str(client_id), error=str(err))


def schedule_client_dispatch(client_id: uuid.UUID) -> None:
    # Tasks are already durable BACKLOG rows; the periodic worker recovers on crash.
    task = asyncio.create_task(_dispatch_client_in_background(client_id))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)



async def _notify_team_in_background(client_id: uuid.UUID) -> None:
    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as bg_db:
            await notify_team_of_new_client_summary(bg_db, client_id)
    except Exception as e_notify:
        logger.error("failed_to_notify_team_of_onboarding_summary", error=str(e_notify))


def schedule_team_notification(client_id: uuid.UUID) -> None:
    """Fire-and-forget the pod brief emails on their own DB session."""
    task = asyncio.create_task(_notify_team_in_background(client_id))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _enrich_and_notify_in_background(client_id: uuid.UUID) -> None:
    from app.db.session import AsyncSessionLocal
    from app.services.brand_dna import brand_dna_input_hash, questionnaire_answers, run_brand_dna_pipeline

    async with AsyncSessionLocal() as bg_db:
        try:
            profile = (
                await bg_db.execute(select(ClientProfile).where(ClientProfile.user_id == client_id))
            ).scalar_one_or_none()
            quest = (await bg_db.execute(select(Questionnaire).where(Questionnaire.user_id == client_id))).scalar_one_or_none()
            roster = await load_pod_roster(bg_db, client_id)
            input_hash = brand_dna_input_hash(questionnaire_answers(quest), roster) if quest else None
            brief = (profile.brand_dna or {}).get("team_brief") if profile else None
            already_llm = bool(
                profile
                and profile.brand_dna_source in ("gemini", "openai")
                and brief
                and quest
                and (quest.answers or {}).get("brand_dna_input_hash") == input_hash
            )
            if already_llm:
                return
            if not already_llm:
                try:
                    await run_brand_dna_pipeline(bg_db, client_id, notify_team=False)
                except Exception as err:
                    if getattr(err, "code", None) != "BRAND_INPUT_CHANGED":
                        raise
                    await bg_db.rollback()
                    await run_brand_dna_pipeline(bg_db, client_id, notify_team=False)
        except Exception as e_dna:
            await bg_db.rollback()
            logger.error("background_brand_dna_enrichment_failed", client_id=str(client_id), error=str(e_dna))
        try:
            await notify_team_of_new_client_summary(bg_db, client_id)
        except Exception as e_notify:
            logger.error("failed_to_notify_team_of_onboarding_summary", error=str(e_notify))


def schedule_brand_enrichment(client_id: uuid.UUID) -> None:
    """Summarise the questionnaire with Gemini and brief the pod, without blocking the client."""
    existing = _enrichment_tasks.get(client_id)
    if existing and not existing.done():
        return
    task = asyncio.create_task(_enrich_and_notify_in_background(client_id))
    _enrichment_tasks[client_id] = task
    _background_tasks.add(task)
    def done(finished: asyncio.Task[None]) -> None:
        _background_tasks.discard(finished)
        if _enrichment_tasks.get(client_id) is finished:
            _enrichment_tasks.pop(client_id, None)
    task.add_done_callback(done)


async def load_pod_roster(db: AsyncSession, client_id: uuid.UUID) -> list[dict[str, str]]:
    """Assigned pod members as [{name, role}] for prompts and briefs."""
    rows = (
        await db.execute(
            select(ClientAssignment, User)
            .join(User, User.id == ClientAssignment.user_id)
            .where(ClientAssignment.client_id == client_id)
        )
    ).all()
    return [{"name": u.full_name or u.email, "role": str(ca.role)} for ca, u in rows]


async def notify_team_of_new_client_summary(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> dict[str, Any]:
    """Dispatch comprehensive Brand DNA brief and client parameters to assigned team lead and specialists."""
    # 1. Fetch Client Profile & Client User
    client_stmt = select(User).where(User.id == client_id)
    client_user = (await db.execute(client_stmt)).scalar_one_or_none()

    profile_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    company_name = (
        (profile.company_name if profile and profile.company_name else None)
        or (client_user.full_name if client_user else None)
        or "New Client"
    )
    ig_handle = profile.instagram_username if profile and profile.instagram_username else "N/A"

    # 2. Resolve Brand DNA data
    brand_dna_data = profile.brand_dna if profile and profile.brand_dna else {}
    if not brand_dna_data:
        try:
            from app.services.brand_dna import run_brand_dna_pipeline
            dna_obj = await run_brand_dna_pipeline(db, client_id)
            if dna_obj:
                brand_dna_data = dna_obj.model_dump()
        except Exception as e_dna:
            logger.warning("could_not_synthesize_brand_dna_for_summary", error=str(e_dna))

    summary_line = (
        brand_dna_data.get("summary_line")
        or (profile.brand_summary if profile else None)
        or "Strategic brand production roadmap active."
    )
    positioning = brand_dna_data.get("positioning") or summary_line

    # 3. Query Assigned Pod Handlers
    ca_stmt = (
        select(ClientAssignment, User)
        .join(User, User.id == ClientAssignment.user_id)
        .where(ClientAssignment.client_id == client_id)
    )
    ca_rows = (await db.execute(ca_stmt)).all()

    if not ca_rows:
        logger.warning("notify_team_no_assignments_found", client_id=str(client_id))
        return {"notified": 0, "emails_sent": 0}

    team_roster = []
    for ca, u in ca_rows:
        role_label = "Pod Specialist"
        if ca.role == "team_lead":
            role_label = "Team Lead & Account Director"
        elif ca.role == "video_editor":
            role_label = "Lead Video Editor (Reels & Motion)"
        elif ca.role == "graphic_designer":
            role_label = "Lead Graphic Designer (Posters & Carousels)"
        team_roster.append({
            "user": u,
            "role_key": ca.role,
            "role_title": role_label,
        })

    # 4. Extract Brand DNA components safely
    tone_data = brand_dna_data.get("tone") or {}
    voice_words = []
    anti_voice = []
    writing_rules = []
    if isinstance(tone_data, dict):
        voice_words = [str(w) for w in (tone_data.get("voice_words") or [])]
        anti_voice = [str(w) for w in (tone_data.get("anti_voice_words") or [])]
        writing_rules = [str(r) for r in (tone_data.get("writing_rules") or [])]
    elif isinstance(tone_data, str):
        voice_words = [w.strip() for w in tone_data.split(",") if w.strip()]

    audience_data = brand_dna_data.get("audience_segments") or []
    pillars_data = brand_dna_data.get("content_pillars") or []
    visual_data = brand_dna_data.get("visual_direction") or {}
    palette = visual_data.get("primary_colors") or brand_dna_data.get("palette") or []
    visual_styles = visual_data.get("styles") or []
    do_not_rules = [str(d) for d in (brand_dna_data.get("do_not") or [])]
    prod_data = brand_dna_data.get("production") or {}
    feasible_formats = prod_data.get("feasible_formats") or brand_dna_data.get("recommended_formats") or []
    reel_style = prod_data.get("default_reel_style") or "talking_head"

    frontend_base = (getattr(settings, "FRONTEND_URL", "https://creo.yogalakshmibaskar20.workers.dev") or "https://creo.yogalakshmibaskar20.workers.dev").rstrip("/")
    portal_link = f"{frontend_base}/admin/clients/{client_id}"

    notified_count = 0
    emails_sent_count = 0

    # Build Team Roster HTML rows
    roster_rows_html = "".join([
        f'<tr>'
        f'<td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #0D2137;">{m["role_title"]}</td>'
        f'<td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; color: #334155;">{m["user"].full_name or m["user"].email}</td>'
        f'<td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 12px;">{m["user"].email}</td>'
        f'</tr>'
        for m in team_roster
    ])

    # Build Content Pillars HTML snippet
    pillars_html = ""
    if isinstance(pillars_data, list) and pillars_data:
        for p in pillars_data:
            if isinstance(p, dict):
                p_name = p.get("name", "Content Pillar")
                p_stage = str(p.get("funnel_stage") or "reach").upper()
                p_rationale = p.get("rationale", "")
                p_formats = ", ".join([str(fmt) for fmt in (p.get("best_formats") or [])])
                pillars_html += f"""
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: #0D2137; font-size: 13px;">{p_name}</strong>
                    <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background-color: #E0F2FE; color: #0369A1;">{p_stage}</span>
                  </div>
                  <p style="margin: 3px 0 0 0; font-size: 12px; color: #475569; line-height: 1.4;">{p_rationale}</p>
                  {f'<p style="margin: 4px 0 0 0; font-size: 11px; color: #2B7BC4;"><strong>Best Formats:</strong> {p_formats}</p>' if p_formats else ''}
                </div>
                """
            elif isinstance(p, str):
                pillars_html += f'<div style="padding: 6px 10px; background: #F8FAFC; border-radius: 6px; margin-bottom: 6px; font-size: 12px; color: #334155;">• {p}</div>'

    # Build Audience HTML snippet
    audience_html = ""
    if isinstance(audience_data, list) and audience_data:
        for a in audience_data:
            if isinstance(a, dict):
                a_name = a.get("name", "Audience Segment")
                a_desc = a.get("description", "")
                a_pain = a.get("core_pain_point", "")
                audience_html += f"""
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                  <strong style="color: #0D2137; font-size: 13px;">{a_name}</strong>
                  <p style="margin: 2px 0; font-size: 12px; color: #475569;">{a_desc}</p>
                  {f'<p style="margin: 4px 0 0 0; font-size: 11px; color: #DC2626;"><strong>Pain Point Solved:</strong> {a_pain}</p>' if a_pain else ''}
                </div>
                """
            elif isinstance(a, str):
                audience_html += f'<p style="font-size: 12px; color: #475569;">• {a}</p>'
    elif brand_dna_data.get("target_audience"):
        audience_html = f'<p style="font-size: 12px; color: #475569;">{brand_dna_data.get("target_audience")}</p>'

    # Build Color Palette chips
    palette_html = ""
    if isinstance(palette, list) and palette:
        palette_html = " ".join([
            f'<span style="display: inline-block; padding: 3px 8px; margin-right: 4px; margin-bottom: 4px; border-radius: 4px; background-color: {c if str(c).startswith("#") else "#2B7BC4"}; color: #FFFFFF; font-size: 10px; font-family: monospace; font-weight: bold; border: 1px solid rgba(0,0,0,0.1);">{c}</span>'
            for c in palette
        ])

    # Build Tone badges
    voice_badges_html = " ".join([
        f'<span style="display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background-color: #EFF6FF; color: #1D4ED8; font-size: 11px; font-weight: bold; border: 1px solid #BFDBFE;">{w}</span>'
        for w in voice_words
    ]) if voice_words else '<span style="color: #64748B; font-size: 12px;">Warm, Bold, Authoritative</span>'

    anti_voice_html = " ".join([
        f'<span style="display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background-color: #FEF2F2; color: #B91C1C; font-size: 11px; font-weight: bold; border: 1px solid #FECACA;">Avoid {w}</span>'
        for w in anti_voice
    ]) if anti_voice else ""

    rules_html = "".join([f'<li style="margin-bottom: 3px;">{r}</li>' for r in writing_rules])
    do_not_html = "".join([f'<li style="margin-bottom: 3px; color: #991B1B;">{r}</li>' for r in do_not_rules]) if do_not_rules else ""

    # Team brief (Gemini-generated when available): summary, tone, directives, pod alignment
    team_brief = brand_dna_data.get("team_brief") or {}
    brief_summary = str(team_brief.get("brand_summary") or positioning)
    brief_tone = [str(t) for t in (team_brief.get("tone_profile") or voice_words)][:5]
    brief_directives = [str(d) for d in (team_brief.get("production_directives") or [])][:5]
    alignment_by_name = {
        str(a.get("member_name", "")).strip().lower(): a
        for a in (team_brief.get("pod_alignment") or [])
        if isinstance(a, dict)
    }
    directives_html = "".join(
        f'<li style="margin-bottom: 4px;">{html.escape(d)}</li>' for d in brief_directives
    )
    brief_html = f"""
              <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #2B7BC4; margin-bottom: 6px;">
                  Questionnaire Brief (A–G)
                </div>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155; line-height: 1.55;">{html.escape(brief_summary)}</p>
                {f'<p style="margin: 0 0 8px 0; font-size: 12px; color: #475569;"><strong>Tone:</strong> {html.escape(", ".join(brief_tone))}</p>' if brief_tone else ''}
                {f'<div style="font-size: 12px; color: #0D2137; font-weight: 700; margin-top: 6px;">Production directives</div><ol style="margin: 4px 0 0 0; padding-left: 20px; font-size: 12px; color: #475569;">{directives_html}</ol>' if directives_html else ''}
              </div>"""

    email_jobs: list[tuple[str, str, str, str]] = []

    # Dispatch to each team member
    for item in team_roster:
        member = item["user"]
        role_title = item["role_title"]
        alignment = alignment_by_name.get(str(member.full_name or member.email).strip().lower())
        alignment_line = (
            f" Why you: {alignment.get('rationale')} (match {alignment.get('match_score')}%)."
            if alignment and alignment.get("rationale")
            else ""
        )
        notif_msg = (
            f"You're on {company_name}'s pod as {role_title}. {brief_summary[:220]}"
            f"{alignment_line} Open the client to see the full questionnaire brief."
        )[:900]

        # 1. In-app Notification with role-based internal route
        if item.get("role_key") == "team_lead":
            in_app_link = f"/lead/clients/{client_id}"
        elif item.get("role_key") in ["video_editor", "graphic_designer", "copywriter"]:
            in_app_link = "/workstation/tasks"
        else:
            in_app_link = "/admin/clients"

        notif = Notification(
            id=uuid.uuid4(),
            user_id=member.id,
            title=f"New Client Assigned: {company_name}",
            message=notif_msg,
            link=in_app_link,
            is_read=False,
            sent_at=datetime.now(UTC),
        )
        db.add(notif)
        notified_count += 1

        # 2. Branded HTML Email
        email_subject = f"[Creo Brief] New Client Assigned: {company_name} — Brand DNA & Roadmap"
        email_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{email_subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9; padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:640px; background-color:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; overflow:hidden; box-shadow:0 4px 16px rgba(15,23,42,0.06);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D2137 0%, #1E609A 100%); padding: 28px 24px; text-align: left;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #93C5FD; margin-bottom: 6px;">
                CREO PRODUCTION ENGINE • POD ASSIGNMENT
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                New Client Assigned: {company_name}
              </h1>
              <p style="margin: 6px 0 0 0; color: #E2E8F0; font-size: 13px;">
                Instagram: @{ig_handle} • Onboarding Complete & Calendar Drafted
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="font-size: 14px; color: #334155; margin-top: 0;">
                Hello <strong>{member.full_name or 'Creative Specialist'}</strong>,
              </p>
              <div style="background-color: #EFF6FF; border-left: 4px solid #2B7BC4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #1E3A8A; font-weight: 600;">
                  You have been assigned as: <span style="color: #2B7BC4; font-weight: 800;">{role_title}</span>
                </p>
              </div>

              <!-- Strategic Vector -->
              <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #2B7BC4; margin-bottom: 6px;">
                  Core Strategic Positioning
                </div>
                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0D2137; font-style: italic; line-height: 1.5;">
                  &ldquo;{positioning}&rdquo;
                </p>
              </div>

              {brief_html}
              {f'<div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #1E3A8A;"><strong>Why you were matched:</strong> {html.escape(str(alignment.get("rationale")))} ({alignment.get("match_score")}% match)</div>' if alignment and alignment.get("rationale") else ''}

              <!-- Pod Roster -->
              <div style="margin-bottom: 24px;">
                <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 8px;">
                  Assigned Creative Pod Handlers
                </h3>
                <table width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; border-collapse: collapse;">
                  {roster_rows_html}
                </table>
              </div>

              <!-- Tone & Voice -->
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 8px;">
                  Tone Profile & Voice Words
                </h3>
                <div style="margin-bottom: 8px;">{voice_badges_html} {anti_voice_html}</div>
                {f'<ul style="margin: 6px 0; padding-left: 20px; font-size: 12px; color: #475569;">{rules_html}</ul>' if rules_html else ''}
              </div>

              <!-- Audience -->
              {f'<div style="margin-bottom: 20px;"><h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 8px;">Target Audience Segments</h3>{audience_html}</div>' if audience_html else ''}

              <!-- Pillars -->
              {f'<div style="margin-bottom: 20px;"><h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 8px;">30-Day Content Pillars</h3>{pillars_html}</div>' if pillars_html else ''}

              <!-- Visual & Production -->
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 8px;">
                  Production Directives
                </h3>
                {f'<div style="margin-bottom: 8px;"><strong>Brand Palette:</strong> {palette_html}</div>' if palette_html else ''}
                <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                  <strong>Default Reel Style:</strong> {str(reel_style).replace("_", " ").title()}
                </div>
                {f'<div style="font-size: 12px; color: #475569; margin-bottom: 4px;"><strong>Feasible Formats:</strong> {", ".join([str(f) for f in feasible_formats])}</div>' if feasible_formats else ''}
              </div>

              <!-- Hard Guardrails -->
              {f'<div style="margin-bottom: 24px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px;"><h4 style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #B91C1C;">Hard Production Guardrails</h4><ul style="margin: 0; padding-left: 20px; font-size: 12px;">{do_not_html}</ul></div>' if do_not_html else ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="{portal_link}" style="display: inline-block; background: linear-gradient(135deg, #2B7BC4 0%, #1E609A 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(43,123,196,0.3);">
                      Open Client Production Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8;">
              Creo Production Intelligence Engine • Automated Brief Dispatch
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        plain_text = (
            f"CREO WORKSPACE POD ASSIGNMENT\n\n"
            f"Client: {company_name} (@{ig_handle})\n"
            f"Role: {role_title}\n"
            f"Strategic Positioning: {positioning}\n\n"
            f"Brief: {brief_summary}\n"
            + "".join(f"- {d}\n" for d in brief_directives)
            + f"\n"
            f"Tone Voice Words: {', '.join(voice_words)}\n"
            f"Pillars Defined: {len(pillars_data)}\n\n"
            f"Open Client Production Workspace: {portal_link}\n"
        )

        if member.email:
            email_jobs.append((member.email, email_subject, email_html, plain_text))

    # In-app notifications land immediately; emails go out in parallel afterwards
    await db.commit()

    async def _send(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        try:
            return bool(await send_email(to_email=to_email, subject=subject, html_content=html_body, text_content=text_body))
        except Exception as email_err:
            logger.warning("failed_to_send_team_brief_email", member=to_email, error=str(email_err))
            return False

    results = await asyncio.gather(*(_send(*job) for job in email_jobs))
    emails_sent_count = sum(1 for ok in results if ok)
    logger.info(
        "team_onboarding_summary_dispatched",
        client_id=str(client_id),
        company=company_name,
        notifications=notified_count,
        emails=emails_sent_count,
    )
    return {"notified": notified_count, "emails_sent": emails_sent_count}

