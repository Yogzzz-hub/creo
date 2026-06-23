from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = False


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None


class NotificationUpdate(BaseModel):
    is_read: bool = True


class NotificationOut(NotificationBase):
    id: str
    created_at: datetime
