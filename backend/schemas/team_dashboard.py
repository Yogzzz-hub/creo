from pydantic import BaseModel, ConfigDict


class DailyMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    posters_completed: int
    posters_cap: int
    reels_completed: int
    reels_cap: int
    stories_completed: int
    stories_cap: int


class TeamDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    daily_metrics: DailyMetrics
    active_tasks_count: int
    overdue_tasks_count: int
    pending_leave_requests: bool
