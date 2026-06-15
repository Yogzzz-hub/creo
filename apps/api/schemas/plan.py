from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import PlanName


class PlanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: PlanName
    display_name: str
    monthly_price: float
    poster_quota: int
    reel_quota: int
    story_quota: int
    revision_rounds: int
    has_dedicated_manager: bool = False
    is_active: bool = True


class PlanCreate(BaseModel):
    name: PlanName
    display_name: str
    monthly_price: float
    poster_quota: int
    reel_quota: int
    story_quota: int
    revision_rounds: int
    has_dedicated_manager: bool = False


class PlanUpdate(BaseModel):
    display_name: Optional[str] = None
    monthly_price: Optional[float] = None
    poster_quota: Optional[int] = None
    reel_quota: Optional[int] = None
    story_quota: Optional[int] = None
    revision_rounds: Optional[int] = None
    has_dedicated_manager: Optional[bool] = None
    is_active: Optional[bool] = None


class PlanOut(PlanBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
