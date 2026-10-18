"""Pydantic schemas for BDE (Business Development Executive), CRM leads, pipeline velocity, and BDE overview."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LeadPriorityEnum(str, Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class LeadStatusEnum(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    MEETING_SCHEDULED = "meeting_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    CONVERTED = "converted"
    LOST = "lost"


class ActivityTypeEnum(str, Enum):
    CALL = "call"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"
    PROPOSAL = "proposal"
    STATUS_CHANGE = "status_change"


class LeadActivityResponse(BaseModel):
    """Activity log entry for lead outreach and conversations."""

    id: uuid.UUID
    lead_id: uuid.UUID
    bde_id: uuid.UUID | None = None
    bde_name: str | None = None
    activity_type: ActivityTypeEnum
    summary: str
    outcome: str | None = None
    scheduled_follow_up: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadActivityCreate(BaseModel):
    """Payload to log a new outreach or follow-up activity."""

    activity_type: ActivityTypeEnum
    summary: str
    outcome: str | None = None
    scheduled_follow_up: datetime | str | None = None


class LeadResponse(BaseModel):
    """Full representation of a prospect lead."""

    id: uuid.UUID
    name: str
    company_name: str
    email: str | None = None
    phone: str | None = None
    requirements: str | None = None
    estimated_deal_value: Decimal = Decimal("0.00")
    lead_source: str = "Outbound"
    priority: LeadPriorityEnum = LeadPriorityEnum.WARM
    status: LeadStatusEnum = LeadStatusEnum.NEW
    lost_reason: str | None = None
    assigned_bde_id: uuid.UUID | None = None
    assigned_bde_name: str | None = None
    assigned_bde_email: str | None = None
    next_follow_up_at: datetime | None = None
    last_contacted_at: datetime | None = None
    activity_count: int = 0
    created_at: datetime
    updated_at: datetime
    activities: list[LeadActivityResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class LeadCreateRequest(BaseModel):
    """Payload to create a new prospect lead."""

    name: str
    company_name: str
    email: str | None = None
    phone: str | None = None
    requirements: str | None = None
    estimated_deal_value: Decimal = Decimal("0.00")
    lead_source: str = "Outbound"
    priority: LeadPriorityEnum = LeadPriorityEnum.WARM
    status: LeadStatusEnum = LeadStatusEnum.NEW
    assigned_bde_id: uuid.UUID | None = None
    next_follow_up_at: datetime | str | None = None


class LeadUpdateRequest(BaseModel):
    """Payload to update an existing lead."""

    name: str | None = None
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    requirements: str | None = None
    estimated_deal_value: Decimal | None = None
    lead_source: str | None = None
    priority: LeadPriorityEnum | None = None
    status: LeadStatusEnum | None = None
    lost_reason: str | None = None
    assigned_bde_id: uuid.UUID | None = None
    next_follow_up_at: datetime | str | None = None


class BDEMetricsResponse(BaseModel):
    """High-level CRM metrics for pipeline value, conversion rate, and stage breakdowns."""

    total_leads: int = 0
    conversion_rate: float = 0.0
    total_pipeline_value: Decimal = Decimal("0.00")
    closed_revenue: Decimal = Decimal("0.00")
    overdue_follow_ups: int = 0
    today_follow_ups: int = 0
    hot_count: int = 0
    warm_count: int = 0
    cold_count: int = 0
    stages: dict[str, int] = Field(default_factory=dict)


class BDEOverviewItem(BaseModel):
    """Individual BDE performance row in admin BDE oversight."""

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str
    is_active: bool = True
    assigned_leads_count: int = 0
    converted_leads_count: int = 0
    pipeline_value: Decimal = Decimal("0.00")
    closed_revenue: Decimal = Decimal("0.00")
    conversion_rate_pct: float = 0.0
    last_active_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BDEOverviewResponse(BaseModel):
    """Consolidated response for Admin BDE Oversight and Sales Velocity."""

    metrics: BDEMetricsResponse
    bde_team: list[BDEOverviewItem] = Field(default_factory=list)
    recent_leads: list[LeadResponse] = Field(default_factory=list)


class BDEStaffRosterItem(BaseModel):
    """BDE representative record displayed in Admin Team Management."""

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str
    role: str = "bde"
    is_active: bool = True
    monthly_quota: Decimal = Decimal("0.00")
    closed_revenue: Decimal = Decimal("0.00")
    active_pipeline: Decimal = Decimal("0.00")
    deals_won: int = 0
    total_leads: int = 0
    conversion_rate_pct: float = 0.0
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BDEOnboardRequest(BaseModel):
    """Payload to onboard a new BDE with targets and credentials dispatch."""

    full_name: str
    email: str
    phone: str | None = None
    designation: str = "Business Development Executive"
    monthly_quota: Decimal = Decimal("2500000.00")
    commission_rate: float = 5.0
    password: str
    dispatch_email: str | None = None
    send_credentials_email: bool = True


class BDECredentialsUpdateRequest(BaseModel):
    """Payload to update BDE credentials or monthly targets."""

    email: str | None = None
    password: str | None = None
    monthly_quota: Decimal | None = None
    dispatch_email: str | None = None
    send_credentials_email: bool = True
