from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AnnouncementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    author_id: str
    title: str
    content: str
    type: str
    target_departments: Optional[list[str]] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str
    target_departments: Optional[list[str]] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    target_departments: Optional[list[str]] = None


class AnnouncementOut(AnnouncementBase):
    id: str
    created_at: datetime
