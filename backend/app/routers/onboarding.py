"""Onboarding API router.

Guarded by upfront Actor dependency and v_client_onboarding derived stages.
"""

from typing import Any
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.questionnaire import Questionnaire
from app.models.user import ClientProfile
from app.schemas.brand_dna import (
    BrandDNA,
    BrandDNAStatusResponse,
    QuestionnaireStateResponse,
    SaveSectionRequest,
)
from app.schemas.onboarding import (
    OnboardingCompleteResponse,
    OnboardingStatusResponse,
    QuestionnaireSubmitRequest,
    TermsAcceptRequest,
)
from app.services import brand_dna, onboarding_service

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusResponse:
    """Retrieve current derived stage and progress flags."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.get_onboarding_status(db, client_id)


@router.post("/terms")
async def accept_terms(
    body: TermsAcceptRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Accept the Master Service Agreement terms."""
    client_id = actor.client_id or actor.user_id
    await onboarding_service.accept_terms(db, client_id, body.terms_version)
    return {"status": "ok", "message": "Terms accepted successfully"}


@router.post("/questionnaire/section")
async def save_questionnaire_section(
    body: SaveSectionRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Autosave an individual section (a..g) without blocking on full form."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.save_questionnaire_section(db, client_id, body.section, body.data)


@router.get("/questionnaire", response_model=QuestionnaireStateResponse)
async def get_questionnaire_state(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> QuestionnaireStateResponse:
    """Retrieve saved state of all questionnaire sections to restore on return."""
    client_id = actor.client_id or actor.user_id
    state = await onboarding_service.get_questionnaire_state(db, client_id)
    return QuestionnaireStateResponse(**state)


@router.post("/brand", status_code=status.HTTP_202_ACCEPTED)
async def queue_brand_dna_generation(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Queue Brand DNA synthesis from questionnaire answers (HTTP 202)."""
    client_id = actor.client_id or actor.user_id
    dna = await brand_dna.run_brand_dna_pipeline(db, client_id)
    return {
        "status": "generating",
        "message": "Brand DNA generation queued",
        "brand_dna": dna.model_dump(),
    }


async def _resolve_brand_status(db: AsyncSession, client_id: uuid.UUID) -> BrandDNAStatusResponse:
    p_stmt = select(ClientProfile).where(ClientProfile.user_id == client_id)
    profile = (await db.execute(p_stmt)).scalar_one_or_none()

    q_stmt = select(Questionnaire).where(Questionnaire.user_id == client_id)
    quest = (await db.execute(q_stmt)).scalar_one_or_none()

    if profile and profile.brand_dna:
        source = profile.brand_dna_source or "template"
        st = "template" if source == "template" else "ready"
        dna_obj = None
        try:
            dna_obj = BrandDNA.model_validate(profile.brand_dna)
        except Exception:
            pass
        return BrandDNAStatusResponse(
            status=st,
            brand_dna=dna_obj,
            brand_dna_source=source,
            brand_dna_version=profile.brand_dna_version or 1,
            summary_line=profile.brand_summary or (dna_obj.summary_line if dna_obj else None),
        )
    elif quest and quest.core_completed_at:
        return BrandDNAStatusResponse(
            status="generating",
            brand_dna=None,
            brand_dna_source="template",
            brand_dna_version=1,
            summary_line=None,
        )
    else:
        return BrandDNAStatusResponse(
            status="pending",
            brand_dna=None,
            brand_dna_source="template",
            brand_dna_version=1,
            summary_line=None,
        )


@router.get("/brand/status", response_model=BrandDNAStatusResponse)
async def get_brand_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> BrandDNAStatusResponse:
    """Check status of Brand DNA pipeline: generating | ready | template."""
    client_id = actor.client_id or actor.user_id
    return await _resolve_brand_status(db, client_id)


@router.get("/brand-dna/status", response_model=BrandDNAStatusResponse)
async def get_brand_dna_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> BrandDNAStatusResponse:
    """Poll Brand DNA synthesis status (alias for backwards compatibility)."""
    client_id = actor.client_id or actor.user_id
    return await _resolve_brand_status(db, client_id)


@router.post("/questionnaire")
async def submit_questionnaire(
    body: QuestionnaireSubmitRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Legacy submit questionnaire endpoint maintaining backward compatibility."""
    client_id = actor.client_id or actor.user_id
    await onboarding_service.submit_questionnaire(db, client_id, body)
    dna = await brand_dna.run_brand_dna_pipeline(db, client_id)
    return {
        "status": "ok",
        "message": "Questionnaire submitted successfully",
        "brand_dna": dna.model_dump() if dna else None,
    }


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> OnboardingCompleteResponse:
    """Complete client onboarding, assign creative pod, and notify handlers with Brand DNA summary."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.complete_onboarding(db, client_id)


@router.post("/resend-summary")
async def resend_onboarding_summary(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Manually dispatch or re-send client Brand DNA summary brief to assigned creative pod handlers."""
    client_id = actor.client_id or actor.user_id
    result = await onboarding_service.notify_team_of_new_client_summary(db, client_id)
    return {
        "status": "ok",
        "message": "Brand DNA summary and onboarding brief dispatched to assigned team lead and specialists.",
        **result,
    }

