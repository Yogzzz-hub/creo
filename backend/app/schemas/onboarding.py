"""Pydantic schemas for onboarding lifecycle, terms, and brand DNA."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OnboardingStatusResponse(BaseModel):
    """Derived onboarding stage and progress checklist."""

    client_id: uuid.UUID
    stage: int = Field(ge=0, le=5, description="Derived stage 0 to 5")
    stage_name: str
    checklist: dict[str, bool]
    deadline: datetime | None = None
    company_name: str | None = None
    instagram_username: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TermsAcceptRequest(BaseModel):
    """Terms acceptance request."""

    terms_version: str = Field(default="v1.0", min_length=1, max_length=20)


class QuestionnaireSubmitRequest(BaseModel):
    """Brand questionnaire submission."""

    company_name: str = Field(min_length=1, max_length=255)
    instagram_username: str = Field(default="", max_length=100)
    target_audience: str = Field(min_length=1, max_length=500)
    tone_keywords: list[str] = Field(default_factory=list, max_length=10)
    competitors: list[str] = Field(default_factory=list, max_length=10)
    color_palette: list[str] = Field(default_factory=list, max_length=10)
    content_goals: list[str] = Field(default_factory=list, max_length=10)
    notes: str | None = Field(default=None, max_length=1000)


class BrandDNASummary(BaseModel):
    """Synthesized brand DNA model validated against LLM output."""

    tone: str
    palette: list[str]
    target_audience: str
    ai_summary_line: str
    recommended_formats: list[str]

    model_config = ConfigDict(extra="ignore")


class BrandDNAStatusResponse(BaseModel):
    """Brand DNA asynchronous generation status."""

    status: str = Field(description="pending | completed | failed")
    brand_dna: BrandDNASummary | None = None
    brand_summary: str | None = None


class OnboardingCompleteResponse(BaseModel):
    """Completion response showing assigned creative pod and targets."""

    status: str
    onboarding_completed_at: datetime
    assigned_team: list[dict[str, Any]]
