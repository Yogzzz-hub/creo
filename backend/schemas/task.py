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


class TaskBulkReassignRequest(BaseModel):
    """Schema for bulk reassignment of tasks to a new team member.

    Used for emergency routing when a designer calls in sick or goes on leave.
    """

    task_ids: list[str] = Field(..., min_length=1, max_length=50)
    new_assignee_id: str


class TaskBulkReassignResponse(BaseModel):
    updated_count: int
    new_assignee_id: str


class TaskTimeLogRequest(BaseModel):
    """Schema for logging time spent on a task."""

    minutes_spent: int = Field(..., gt=0, le=480)


class TaskTimeLogResponse(BaseModel):
    task_id: str
    actual_minutes: int
    estimated_minutes: Optional[int] = None


class TaskExpediteRequest(BaseModel):
    """Schema for toggling task expedite status."""

    is_expedited: bool


class TaskExpediteResponse(BaseModel):
    task_id: str
    is_expedited: bool
