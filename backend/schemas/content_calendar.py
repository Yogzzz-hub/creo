from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import CalendarEntryStatus, DeliverableType


class ContentCalendarBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    content_plan_id: Optional[str] = None
    scheduled_date: date
    deliverable_type: DeliverableType
    content_topic: Optional[str] = None
    status: CalendarEntryStatus = CalendarEntryStatus.draft


class ContentCalendarCreate(BaseModel):
    client_id: str
    content_plan_id: Optional[str] = None
    scheduled_date: date
    deliverable_type: DeliverableType
    content_topic: Optional[str] = None


class ContentCalendarUpdate(BaseModel):
    content_plan_id: Optional[str] = None
    scheduled_date: Optional[date] = None
    content_topic: Optional[str] = None
    status: Optional[CalendarEntryStatus] = None
    linked_task_id: Optional[str] = None
    linked_deliverable_id: Optional[str] = None


class ContentCalendarOut(ContentCalendarBase):
    id: str
    linked_task_id: Optional[str] = None
    linked_deliverable_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
