import enum


class UserRole(str, enum.Enum):
    client = "client"
    team_member = "team_member"
    team_lead = "team_lead"
    sales = "sales"
    admin = "admin"
    investor_relations = "investor_relations"
    super_admin = "super_admin"


class AccountStatus(str, enum.Enum):
    pending_verification = "pending_verification"
    pending_payment = "pending_payment"
    active = "active"
    lapsed = "lapsed"
    suspended = "suspended"
    deleted = "deleted"


class PlanName(str, enum.Enum):
    starter = "starter"
    growth = "growth"
    pro = "pro"


class DeliverableType(str, enum.Enum):
    poster = "poster"
    reel = "reel"
    story = "story"


class DeliverableStatus(str, enum.Enum):
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    revision_in_progress = "revision_in_progress"
    revised_pending_approval = "revised_pending_approval"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    submitted = "submitted"
    approved = "approved"
    revision = "revision"
    overdue = "overdue"
    assignment_requested = "assignment_requested"


class TicketType(str, enum.Enum):
    deliverable_revision = "deliverable_revision"
    general_support = "general_support"
    billing_issue = "billing_issue"
    content_brief_update = "content_brief_update"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    awaiting_client = "awaiting_client"
    resolved = "resolved"
    escalated = "escalated"


class Department(str, enum.Enum):
    graphics = "graphics"
    video = "video"
    content_writing = "content_writing"
    social_media = "social_media"
    sales = "sales"
    investor_relations = "investor_relations"
    admin = "admin"
    tech = "tech"


class PaymentGateway(str, enum.Enum):
    razorpay = "razorpay"
    stripe = "stripe"


class ContentPlanStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"


class CalendarEntryStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    in_progress = "in_progress"
    ready_for_review = "ready_for_review"
    approved = "approved"
    rejected = "rejected"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CustomPricingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AddonStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"
