from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class MemberMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_member_id: str
    name: str
    role: str
    active_tasks: int
    overdue_tasks: int
    today_completed: int
    daily_cap_posters: int
    daily_cap_reels: int
    daily_cap_stories: int


class TeamOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    members: List[MemberMetrics]
