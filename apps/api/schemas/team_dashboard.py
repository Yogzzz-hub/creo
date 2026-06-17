from pydantic import BaseModel


class DailyMetrics(BaseModel):
    posters_completed: int
    posters_cap: int
    reels_completed: int
    reels_cap: int
    stories_completed: int
    stories_cap: int


class TeamDashboardResponse(BaseModel):
    daily_metrics: DailyMetrics
    active_tasks_count: int
    overdue_tasks_count: int
    pending_leave_requests: bool
