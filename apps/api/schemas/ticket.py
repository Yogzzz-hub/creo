from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import TicketStatus, TicketType


class TicketBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    ticket_type: TicketType
    subject: str
    description: str
    status: TicketStatus = TicketStatus.open
    assigned_to: Optional[str] = None


class TicketCreate(BaseModel):
    ticket_type: TicketType
    subject: str
    description: str


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None


class TicketOut(TicketBase):
    id: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class TicketMessageBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    sender_id: str
    message_text: str
    file_url: Optional[str] = None


class TicketMessageCreate(BaseModel):
    message_text: str
    file_url: Optional[str] = None


class TicketMessageOut(TicketMessageBase):
    id: str
    created_at: datetime
