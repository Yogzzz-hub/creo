"""Pydantic schemas for Team Productivity, Specialist Efficiency, and Workload Balancing."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CategoryDistribution(BaseModel):
    """Deliverable counts broken down by creative deliverable format."""

    reel: int = 0
    static_post: int = 0
    carousel: int = 0
    story: int = 0


class SpecialistMetricSchema(BaseModel):
    """Detailed operational productivity metric for an individual creative specialist or freelancer."""

    id: uuid.UUID
    name: str
    email: str
    role: str
    department: str
    is_freelancer: bool = False
    specialty: str = "Video Specialist"
    hourly_rate: Decimal | None = None
    tasks_assigned: int = 0
    tasks_completed: int = 0
    tasks_pending: int = 0
    tasks_overdue: int = 0
    tasks_rejected_revisions: int = 0
    revision_rate_pct: float = 0.0
    avg_turnaround_hours: float = 0.0
    on_time_count: int = 0
    late_count: int = 0
    on_time_completion_pct: float = 0.0
    allocated_workload_pct: float = 0.0
    capacity_status: str = "Optimal"
    category_distribution: CategoryDistribution = Field(default_factory=CategoryDistribution)

    model_config = ConfigDict(from_attributes=True)


class ComparativeBenchmarkSchema(BaseModel):
    """Efficiency benchmark comparing top leaders and runner-ups by deliverable format."""

    category: str
    leader: str
    runner_up: str
    leader_completed: int = 0
    runner_up_completed: int = 0
    leader_turnaround: float = 0.0
    runner_up_turnaround: float = 0.0
    delta_efficiency_pct: float = 0.0


class ProductivitySummarySchema(BaseModel):
    """Aggregated executive summary of production velocity and quality metrics."""

    total_assigned: int = 0
    tasks_completed: int = 0
    tasks_pending: int = 0
    tasks_overdue: int = 0
    revision_rate_pct: float = 0.0
    avg_turnaround_hours: float = 0.0
    on_time_completion_pct: float = 0.0


class WorkloadImbalanceSchema(BaseModel):
    """Identified overloaded vs underutilized specialists with recommendation advice."""

    overloaded: list[SpecialistMetricSchema] = Field(default_factory=list)
    underutilized: list[SpecialistMetricSchema] = Field(default_factory=list)
    recommended_rebalancing_actions: list[str] = Field(default_factory=list)


class ProductivityResponse(BaseModel):
    """Full payload for the Admin Productivity and Efficiency dashboard."""

    period: str = "30d"
    summary: ProductivitySummarySchema
    specialists: list[SpecialistMetricSchema] = Field(default_factory=list)
    comparisons: list[ComparativeBenchmarkSchema] = Field(default_factory=list)
    workload_imbalance: WorkloadImbalanceSchema
