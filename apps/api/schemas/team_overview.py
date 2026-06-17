from typing import List, Optional

from pydantic import BaseModel


class MemberMetrics(BaseModel):
    team_member_id: str
    name: str
    role: str
    active_tasks: int
    overdue_tasks: int
    today_completed: int
    today_cap: Optional[int] = None


class TeamOverviewResponse(BaseModel):
    members: List[MemberMetrics]
