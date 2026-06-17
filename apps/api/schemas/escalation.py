from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EscalationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    client_id: str
    assigned_to: Optional[str] = None
    severity: int = 1
    reason: str
    status: str = "open"


class EscalationCreate(BaseModel):
    task_id: str
    client_id: str
    assigned_to: Optional[str] = None
    severity: int = 1
    reason: str


class EscalationUpdate(BaseModel):
    assigned_to: Optional[str] = None
    severity: Optional[int] = None
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None


class EscalationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    client_id: str
    assigned_to: Optional[str] = None
    severity: int
    reason: str
    status: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EscalationOut(EscalationBase):
    id: str
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EscalationResolveRequest(BaseModel):
    resolution_notes: str
