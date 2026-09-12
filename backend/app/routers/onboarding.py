"""Onboarding API router.

Guarded by upfront Actor dependency and v_client_onboarding derived stages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.schemas.onboarding import (
    BrandDNAStatusResponse,
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


@router.post("/questionnaire")
async def submit_questionnaire(
    body: QuestionnaireSubmitRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Submit brand discovery questionnaire and synthesize Brand DNA."""
    client_id = actor.client_id or actor.user_id
    quest = await onboarding_service.submit_questionnaire(db, client_id, body)
    # Synthesize brand DNA
    dna = await brand_dna.generate_brand_dna(db, client_id, quest.id)
    return {
        "status": "ok",
        "message": "Questionnaire submitted successfully",
        "brand_dna": dna.model_dump() if dna else None,
    }


@router.get("/brand-dna/status", response_model=BrandDNAStatusResponse)
async def get_brand_dna_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> BrandDNAStatusResponse:
    """Poll Brand DNA synthesis status."""
    client_id = actor.client_id or actor.user_id
    return await brand_dna.get_brand_dna_status(db, client_id)


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> OnboardingCompleteResponse:
    """Complete client onboarding and assign creative pod."""
    client_id = actor.client_id or actor.user_id
    return await onboarding_service.complete_onboarding(db, client_id)
