from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

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


class ClientInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    business_name: Optional[str] = None
    plan_name: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    client: Optional[ClientInfo] = None
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    deliverable_type: DeliverableType
    status: TaskStatus
    priority: int
    is_addon: bool
    assignment_date: Optional[date] = None
    due_date: Optional[date] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TaskDetailResponse(TaskResponse):
    content_brief: Optional[str] = None
    ai_analysis_excerpt: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskSubmitRequest(BaseModel):
    file_url: str = Field(..., max_length=2048)
    file_type: str = Field(..., max_length=127)
    file_size_bytes: int = Field(..., ge=1)


class TaskAssignmentApproveRequest(BaseModel):
    team_member_id: str
