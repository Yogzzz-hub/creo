from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.enums import AccountStatus, CalendarEntryStatus, DeliverableStatus, DeliverableType


class DashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pending_deliverable_count: int
    open_ticket_count: int
    ai_summary_line: Optional[str] = None
    onboarding_stage: int
    account_status: str


class SubscriptionStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    account_status: AccountStatus


class DeliverableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    client_id: str
    submitted_by: str
    file_url: str
    file_type: str
    file_size_bytes: int
    status: DeliverableStatus
    revision_round: int
    parent_deliverable_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    instagram_published_at: Optional[datetime] = None
    instagram_post_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class DeliverableRejectRequest(BaseModel):
    comment_text: str = Field(..., min_length=1, max_length=2000)


class CalendarEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    content_plan_id: Optional[str] = None
    scheduled_date: date
    deliverable_type: DeliverableType
    content_topic: Optional[str] = None
    status: CalendarEntryStatus
    linked_task_id: Optional[str] = None
    linked_deliverable_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
