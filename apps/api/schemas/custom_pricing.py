from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import CustomPricingStatus


class CustomPricingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    plan_id: str
    custom_price: float
    approved_by: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    status: CustomPricingStatus = CustomPricingStatus.pending


class CustomPricingCreate(BaseModel):
    plan_id: str
    custom_price: float


class CustomPricingUpdate(BaseModel):
    status: CustomPricingStatus
    approved_by: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class CustomPricingOut(CustomPricingBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
