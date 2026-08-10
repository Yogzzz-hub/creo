from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.enums import Department, PlanName, UserRole


# ---------------------------------------------------------------------------
# Admin Dashboard
# ---------------------------------------------------------------------------

class AdminDashboardResponse(BaseModel):
    total_active_clients: int
    mrr_estimate: float
    active_escalations: int
    pending_leave_requests: int


# ---------------------------------------------------------------------------
# Admin Clients
# ---------------------------------------------------------------------------

class AdminClientListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    business_name: Optional[str] = None
    email: str
    plan_name: Optional[str] = None
    status: str
    created_at: datetime


class SubscriptionSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: str
    plan_name: Optional[str] = None
    status: str
    monthly_price: Optional[float] = None
    gateway: str
    current_period_start: datetime
    current_period_end: datetime


class AdminClientDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    full_name: str
    business_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    plan_name: Optional[str] = None
    status: str
    created_at: datetime
    subscriptions: list[SubscriptionSnapshot] = []
    deliverables_count: int = 0
    open_tickets_count: int = 0


# ---------------------------------------------------------------------------
# Admin Team Management
# ---------------------------------------------------------------------------

class TeamMemberAdminCreate(BaseModel):
    email: str = Field(..., max_length=255)
    full_name: str = Field(..., max_length=255)
    role: UserRole = Field(..., description="Must be team_member or team_lead")
    department: Department
    daily_poster_cap: int = Field(default=6, ge=0)
    daily_reel_cap: int = Field(default=4, ge=0)
    daily_story_cap: int = Field(default=3, ge=0)


class TeamMemberAdminUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255)
    role: Optional[UserRole] = None
    department: Optional[Department] = None
    daily_poster_cap: Optional[int] = Field(default=None, ge=0)
    daily_reel_cap: Optional[int] = Field(default=None, ge=0)
    daily_story_cap: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class TeamMemberAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_member_id: str
    user_id: str
    full_name: str
    email: str
    role: str
    department: str
    daily_cap_posters: int
    daily_cap_reels: int
    daily_cap_stories: int
    is_active: bool
    joined_at: date
