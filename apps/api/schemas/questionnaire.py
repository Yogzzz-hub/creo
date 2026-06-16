from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class QuestionnaireBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    industry: str = Field(..., max_length=200)
    business_description: str = Field(..., max_length=2000)
    target_audience: dict[str, Any]
    social_handles: dict[str, Any]
    current_posting_frequency: Optional[str] = Field(None, max_length=100)
    content_what_works: Optional[str] = Field(None, max_length=2000)
    content_what_doesnt: Optional[str] = Field(None, max_length=2000)
    primary_goal: str = Field(..., max_length=100)
    brand_tone: list[str] = Field(..., max_length=10)
    competitor_refs: Optional[list[str]] = Field(None, max_length=20)
    topics_to_avoid: Optional[str] = Field(None, max_length=1000)
    style_references: Optional[list[str]] = Field(None, max_length=20)


class QuestionnaireCreate(BaseModel):
    industry: str = Field(..., max_length=200)
    business_description: str = Field(..., max_length=2000)
    target_audience: dict[str, Any]
    social_handles: dict[str, Any]
    current_posting_frequency: Optional[str] = Field(None, max_length=100)
    content_what_works: Optional[str] = Field(None, max_length=2000)
    content_what_doesnt: Optional[str] = Field(None, max_length=2000)
    primary_goal: str = Field(..., max_length=100)
    brand_tone: list[str] = Field(..., max_length=10)
    competitor_refs: Optional[list[str]] = Field(None, max_length=20)
    topics_to_avoid: Optional[str] = Field(None, max_length=1000)
    style_references: Optional[list[str]] = Field(None, max_length=20)


class QuestionnaireUpdate(BaseModel):
    industry: Optional[str] = Field(None, max_length=200)
    business_description: Optional[str] = Field(None, max_length=2000)
    target_audience: Optional[dict[str, Any]] = None
    social_handles: Optional[dict[str, Any]] = None
    current_posting_frequency: Optional[str] = Field(None, max_length=100)
    content_what_works: Optional[str] = Field(None, max_length=2000)
    content_what_doesnt: Optional[str] = Field(None, max_length=2000)
    primary_goal: Optional[str] = Field(None, max_length=100)
    brand_tone: Optional[list[str]] = Field(None, max_length=10)
    competitor_refs: Optional[list[str]] = Field(None, max_length=20)
    topics_to_avoid: Optional[str] = Field(None, max_length=1000)
    style_references: Optional[list[str]] = Field(None, max_length=20)
    ai_analysis: Optional[dict[str, Any]] = None
    ai_summary_line: Optional[str] = Field(None, max_length=200)


class QuestionnaireOut(QuestionnaireBase):
    id: str
    ai_analysis: Optional[dict[str, Any]] = None
    ai_summary_line: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime] = None


class QuestionnaireStatusResponse(BaseModel):
    status: str
    summary_line: Optional[str] = None
