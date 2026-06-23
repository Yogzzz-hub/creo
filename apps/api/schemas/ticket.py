from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.enums import TicketStatus, TicketType


class TicketBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    ticket_type: TicketType
    subject: str = Field(..., max_length=200)
    description: str = Field(..., max_length=2000)
    status: TicketStatus = TicketStatus.open
    assigned_to: Optional[str] = None
    linked_deliverable_id: Optional[str] = None


class TicketCreate(BaseModel):
    ticket_type: TicketType
    subject: str = Field(..., max_length=200)
    description: str = Field(..., max_length=2000)
    linked_deliverable_id: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    reopened_at: Optional[datetime] = None


class TicketOut(TicketBase):
    id: str
    ticket_number: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    reopened_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TicketMessageBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    sender_id: str
    message_text: Optional[str] = Field(None, max_length=5000)
    file_url: Optional[str] = Field(None, max_length=2048)
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    is_read: bool = False


class TicketMessageCreate(BaseModel):
    message_text: Optional[str] = Field(None, max_length=5000)
    file_url: Optional[str] = Field(None, max_length=2048)
    file_name: Optional[str] = None


class TicketMessageOut(TicketMessageBase):
    id: str
    created_at: datetime
