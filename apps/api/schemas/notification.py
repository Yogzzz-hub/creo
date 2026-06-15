from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    type: str
    title: str
    message: str
    is_read: bool = False


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str


class NotificationUpdate(BaseModel):
    is_read: bool = True


class NotificationOut(NotificationBase):
    id: str
    created_at: datetime
