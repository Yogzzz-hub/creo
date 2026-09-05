from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import CustomPricingStatus


class CustomPricingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    plan_id: str
    custom_price: float
    standard_price: float
    discount_percent: float
    requested_by: str
    approved_by: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    status: CustomPricingStatus = CustomPricingStatus.pending


class CustomPricingCreate(BaseModel):
    plan_id: str
    custom_price: float
    standard_price: float
    discount_percent: float
    notes: Optional[str] = None


class CustomPricingUpdate(BaseModel):
    status: CustomPricingStatus
    approved_by: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class CustomPricingOut(CustomPricingBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AdminCustomPricingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_name: str
    business_name: Optional[str] = None
    plan_name: Optional[str] = None
    custom_price: float
    status: str
    reason: Optional[str] = None
    created_at: datetime
