from pydantic import BaseModel


class TeamCapacityBar(BaseModel):
    team_member_name: str
    current_load: int
    max_capacity: int


class KPIDashboardResponse(BaseModel):
    delivery_rate_percentage: float
    active_capacity_percentage: float
    total_revenue: float | None
    team_capacity_bars: list[TeamCapacityBar]
