from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import LeaveStatus


class LeaveRequestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_member_id: str
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus = LeaveStatus.pending
    approved_by: Optional[str] = None


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus
    approved_by: Optional[str] = None


class LeaveRequestOut(LeaveRequestBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AdminLeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_member_id: str
    employee_name: str
    department: str
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    created_at: datetime
