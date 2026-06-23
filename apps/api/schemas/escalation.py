from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EscalationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: str
    severity: str = "low"
    client_id: Optional[str] = None
    task_id: Optional[str] = None
    ticket_id: Optional[str] = None
    assigned_to: Optional[str] = None
    description: str
    status: str = "active"


class EscalationCreate(BaseModel):
    type: str
    severity: str = "low"
    client_id: Optional[str] = None
    task_id: Optional[str] = None
    ticket_id: Optional[str] = None
    assigned_to: Optional[str] = None
    description: str


class EscalationUpdate(BaseModel):
    assigned_to: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None


class EscalationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    severity: str
    client_id: Optional[str] = None
    task_id: Optional[str] = None
    ticket_id: Optional[str] = None
    assigned_to: Optional[str] = None
    description: str
    status: str
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EscalationOut(EscalationBase):
    id: str
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EscalationResolveRequest(BaseModel):
    resolved_by: Optional[str] = None
