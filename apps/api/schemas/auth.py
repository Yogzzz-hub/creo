from pydantic import BaseModel, ConfigDict, EmailStr

from models.enums import UserRole


class RegisterRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    auth_id: str
    email: str
    phone: str | None = None
    full_name: str
    business_name: str | None = None


class RegisterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    account_status: str
