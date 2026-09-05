from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import ContentPlanStatus


class ContentPlanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    month: int
    year: int
    status: ContentPlanStatus = ContentPlanStatus.draft


class ContentPlanCreate(BaseModel):
    client_id: str
    month: int
    year: int
    pdf_url: Optional[str] = None


class ContentPlanUpdate(BaseModel):
    status: Optional[ContentPlanStatus] = None
    pdf_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None


class ContentPlanOut(ContentPlanBase):
    id: str
    pdf_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
