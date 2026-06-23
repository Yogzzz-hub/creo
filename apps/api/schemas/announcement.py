from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TargetAudience(str, Enum):
    all = "all"
    clients = "clients"
    team = "team"


class AnnouncementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    author_id: str
    title: str
    content: str
    type: str
    target_departments: Optional[list[str]] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: TargetAudience = TargetAudience.all
    file_url: Optional[str] = None
    file_name: Optional[str] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    target_departments: Optional[list[str]] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    author_id: str
    title: str
    content: str
    type: str
    target_departments: Optional[list[str]] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class AnnouncementOut(AnnouncementBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
