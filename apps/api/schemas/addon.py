from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.enums import AddonStatus, DeliverableType, PaymentGateway


class AddonPricingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deliverable_type: DeliverableType
    unit_price: float
    is_active: bool = True


class AddonPricingUpdate(BaseModel):
    unit_price: Optional[float] = None
    is_active: Optional[bool] = None


class AddonPricingOut(AddonPricingBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AddonBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    deliverable_type: DeliverableType
    quantity: int
    unit_price: float
    total_price: float
    status: AddonStatus = AddonStatus.pending
    gateway: Optional[PaymentGateway] = None
    payment_id: Optional[str] = None


class AddonCreate(BaseModel):
    deliverable_type: DeliverableType
    quantity: int


class AddonUpdate(BaseModel):
    status: Optional[AddonStatus] = None
    gateway: Optional[PaymentGateway] = None
    payment_id: Optional[str] = None


class AddonOut(AddonBase):
    id: str
    created_at: datetime
