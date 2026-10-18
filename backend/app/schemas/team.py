"""Pydantic schemas for Admin Team Management, Creative Pods, Staff Roster, and Capacity."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TeamMemberItem(BaseModel):
    """Team member or specialist item in administrative team rosters."""

    id: uuid.UUID
    name: str
    email: str
    role: str
    department: str = "Creative Production"
    is_active: bool = True
    pod_id: uuid.UUID | None = None
    pod_name: str | None = None
    assigned_clients_count: int = 0
    assigned_tasks_count: int = 0
    active_tasks_count: int = 0
    capacity_pct: float = 0.0
    status: str = "Active"
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CreativePodResponse(BaseModel):
    """Creative pod cluster with lead and assigned specialists."""

    id: uuid.UUID
    name: str
    lead_id: uuid.UUID | None = None
    lead_name: str | None = None
    member_count: int = 0
    assigned_clients_count: int = 0
    sla_compliance_rate: float = 100.0
    status: str = "Optimal"
    members: list[TeamMemberItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class BDEOnboardRequest(BaseModel):
    """Payload to onboard a Business Development Executive."""

    name: str
    email: str
    password: str | None = None
    phone: str | None = None
    notes: str | None = None
    dispatch_email: str | None = None
    send_email: bool = True


class TeamMemberCreateRequest(BaseModel):
    """Payload to onboard or provision a creative squad specialist."""

    full_name: str
    email: str
    password: str | None = None
    department: str = "creative"
    role: str = "editor"
    daily_capacity: int = 4
    skills: list[str] = Field(default_factory=list)
    team_lead_id: uuid.UUID | None = None
    dispatch_email: str | None = None
    send_email: bool = True


class UpdateMemberCredentialsRequest(BaseModel):
    """Payload to set or reset team member login credentials."""

    email: str | None = None
    password: str
    dispatch_email: str | None = None
    send_email: bool = True


class SendCredentialsEmailRequest(BaseModel):
    """Payload to dispatch credentials email to user or separate notification address."""

    password: str
    dispatch_email: str | None = None


class StaffAllocationUpdateRequest(BaseModel):
    """Payload to reassign a specialist or BDE to a pod or lead."""

    pod_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    role: str | None = None
    is_active: bool | None = None


class TeamManagementOverviewResponse(BaseModel):
    """Consolidated response for Admin Team Management page."""

    total_staff: int = 0
    active_pods: list[CreativePodResponse] = Field(default_factory=list)
    bde_count: int = 0
    freelancer_count: int = 0
    unassigned_specialists: list[TeamMemberItem] = Field(default_factory=list)
