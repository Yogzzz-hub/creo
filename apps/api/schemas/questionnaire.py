from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class QuestionnaireBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    industry: str
    business_description: str
    target_audience: dict[str, Any]
    social_handles: dict[str, Any]
    current_posting_frequency: Optional[str] = None
    content_what_works: Optional[str] = None
    content_what_doesnt: Optional[str] = None
    primary_goal: str
    brand_tone: list[str]
    competitor_refs: Optional[list[str]] = None
    topics_to_avoid: Optional[str] = None
    style_references: Optional[list[str]] = None


class QuestionnaireCreate(BaseModel):
    industry: str
    business_description: str
    target_audience: dict[str, Any]
    social_handles: dict[str, Any]
    current_posting_frequency: Optional[str] = None
    content_what_works: Optional[str] = None
    content_what_doesnt: Optional[str] = None
    primary_goal: str
    brand_tone: list[str]
    competitor_refs: Optional[list[str]] = None
    topics_to_avoid: Optional[str] = None
    style_references: Optional[list[str]] = None


class QuestionnaireUpdate(BaseModel):
    industry: Optional[str] = None
    business_description: Optional[str] = None
    target_audience: Optional[dict[str, Any]] = None
    social_handles: Optional[dict[str, Any]] = None
    current_posting_frequency: Optional[str] = None
    content_what_works: Optional[str] = None
    content_what_doesnt: Optional[str] = None
    primary_goal: Optional[str] = None
    brand_tone: Optional[list[str]] = None
    competitor_refs: Optional[list[str]] = None
    topics_to_avoid: Optional[str] = None
    style_references: Optional[list[str]] = None
    ai_analysis: Optional[dict[str, Any]] = None
    ai_summary_line: Optional[str] = None


class QuestionnaireOut(QuestionnaireBase):
    id: str
    ai_analysis: Optional[dict[str, Any]] = None
    ai_summary_line: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime] = None
