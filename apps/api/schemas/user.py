from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from models.enums import AccountStatus, PlanName, UserRole


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    phone: Optional[str] = None
    full_name: str
    business_name: Optional[str] = None
    role: UserRole = UserRole.client
    account_status: AccountStatus = AccountStatus.pending_verification
    plan_name: Optional[PlanName] = None
    two_fa_enabled: bool = False


class UserCreate(BaseModel):
    auth_id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    business_name: Optional[str] = None
    role: UserRole = UserRole.client


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    plan_name: Optional[PlanName] = None
    account_status: Optional[AccountStatus] = None
    instagram_access_token: Optional[str] = None
    instagram_user_id: Optional[str] = None
    razorpay_customer_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    two_fa_enabled: Optional[bool] = None


class UserOut(UserBase):
    id: str
    auth_id: str
    instagram_user_id: Optional[str] = None
    razorpay_customer_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
