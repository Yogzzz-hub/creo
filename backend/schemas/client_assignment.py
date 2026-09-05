from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import DeliverableType


class ClientAssignmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    team_member_id: str
    deliverable_type: DeliverableType
    is_active: bool = True


class ClientAssignmentCreate(BaseModel):
    client_id: str
    team_member_id: str
    deliverable_type: DeliverableType
    assigned_by: Optional[str] = None


class ClientAssignmentUpdate(BaseModel):
    is_active: Optional[bool] = None


class ClientAssignmentOut(ClientAssignmentBase):
    id: str
    assigned_at: datetime
    assigned_by: Optional[str] = None
    created_at: datetime
