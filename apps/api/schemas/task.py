from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import DeliverableType, TaskStatus


class TaskBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    deliverable_type: DeliverableType
    content_brief: Optional[str] = None
    status: TaskStatus = TaskStatus.pending
    priority: int = 1
    is_addon: bool = False
    addon_id: Optional[str] = None
    calendar_entry_id: Optional[str] = None
    assignment_date: Optional[date] = None
    due_date: Optional[date] = None


class TaskCreate(BaseModel):
    client_id: str
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    deliverable_type: DeliverableType
    content_brief: Optional[str] = None
    priority: int = 1
    is_addon: bool = False
    addon_id: Optional[str] = None
    calendar_entry_id: Optional[str] = None
    assignment_date: Optional[date] = None
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    content_brief: Optional[str] = None
    priority: Optional[int] = None
    assignment_date: Optional[date] = None
    due_date: Optional[date] = None
    submitted_at: Optional[datetime] = None


class TaskOut(TaskBase):
    id: str
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
