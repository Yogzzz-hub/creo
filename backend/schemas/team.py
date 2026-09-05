from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import Department


class TeamMemberBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    department: Department
    daily_cap_posters: int = 6
    daily_cap_reels: int = 4
    daily_cap_stories: int = 3
    is_active: bool = True
    joined_at: date


class TeamMemberCreate(BaseModel):
    user_id: str
    department: Department
    daily_cap_posters: int = 6
    daily_cap_reels: int = 4
    daily_cap_stories: int = 3
    joined_at: date


class TeamMemberUpdate(BaseModel):
    department: Optional[Department] = None
    daily_cap_posters: Optional[int] = None
    daily_cap_reels: Optional[int] = None
    daily_cap_stories: Optional[int] = None
    is_active: Optional[bool] = None


class TeamMemberOut(TeamMemberBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
