"""Pydantic schemas for Freelancer Dashboard, management roster, and task assignments."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FreelancerStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REVOKED = "REVOKED"


class FreelancerProfileResponse(BaseModel):
    """Freelancer specialist profile item returned in rosters and dashboards."""

    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    full_name: str
    is_active: bool = True
    status: FreelancerStatusEnum = FreelancerStatusEnum.ACTIVE
    specialty: str = "Video Editor / Motion Designer"
    hourly_rate: Decimal | None = None
    portfolio_link: str | None = None
    portfolio_url: str | None = None
    notes: str | None = None
    skills: list[str] = Field(default_factory=list)
    assigned_tasks_count: int = 0
    active_tasks_count: int = 0
    completed_tasks_count: int = 0
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class FreelancerCreateRequest(BaseModel):
    """Payload to invite or onboard a new freelancer specialist."""

    email: str
    full_name: str
    password: str | None = None
    hourly_rate: Decimal | None = None
    specialty: str | None = "Video Editor / Motion Designer"
    portfolio_link: str | None = None
    portfolio_url: str | None = None
    notes: str | None = None
    skills: list[str] = Field(default_factory=list)
    dispatch_email: str | None = None
    send_email: bool = True


class FreelancerUpdateRequest(BaseModel):
    """Payload to update freelancer profile metadata."""

    full_name: str | None = None
    specialty: str | None = None
    hourly_rate: Decimal | None = None
    portfolio_link: str | None = None
    portfolio_url: str | None = None
    notes: str | None = None
    skills: list[str] | None = None
    is_active: bool | None = None
    status: FreelancerStatusEnum | None = None


class FreelancerAssignRequest(BaseModel):
    """Payload to assign a production deliverable or sprint task to a freelancer."""

    deliverable_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    task_title: str | None = None
    instructions: str | None = None
    role_description: str | None = None
    due_date: datetime | str | None = None
    priority: str = "standard"
    milestone_fee: Decimal | None = None


class FreelancerTaskItem(BaseModel):
    """Deliverable item assigned to a freelancer specialist."""

    id: uuid.UUID
    deliverable_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    client_name: str | None = None
    title: str
    description: str | None = None
    format: str | None = "reel"
    status: str = "in_progress"
    due_date: datetime | str | None = None
    brief_url: str | None = None
    assigned_at: datetime | None = None
    milestone_fee: Decimal | None = None
    deliverables: list[dict[str, Any]] = Field(default_factory=list)
    blueprint: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class FreelancerSubmissionRequest(BaseModel):
    """Submission payload for completed deliverable files from freelancer."""

    deliverable_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    asset_url: str
    storage_path: str | None = None
    title: str | None = None
    submission_notes: str | None = None


class FreelancerDashboardResponse(BaseModel):
    """Consolidated summary response for the freelancer specialist dashboard."""

    profile: FreelancerProfileResponse
    active_tasks: list[FreelancerTaskItem] = Field(default_factory=list)
    pending_submissions_count: int = 0
    earnings_total: Decimal = Decimal("0.00")
    recent_activity: list[dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
