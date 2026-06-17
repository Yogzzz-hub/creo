from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TeamCalendarEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scheduled_date: date
    display_date: date
    deliverable_type: str
    client_name: str
    status: str
    linked_task_id: Optional[str] = None
