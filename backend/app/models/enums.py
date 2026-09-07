"""PostgreSQL enum types defined as Python StrEnum."""

from enum import StrEnum
from typing import Any

from sqlalchemy import Enum as SAEnum


def pg_enum(enum_cls: type[Any], name: str) -> SAEnum:
    return SAEnum(
        enum_cls,
        name=name,
        create_type=False,
        values_callable=lambda x: [e.value for e in x],
    )


class UserRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SALES = "sales"
    TEAM_LEAD = "team_lead"
    EDITOR = "editor"
    DESIGNER = "designer"
    CLIENT = "client"
    INVESTOR_RELATIONS = "investor_relations"


class AccountStatus(StrEnum):
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    LAPSED = "lapsed"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class SubscriptionStatus(StrEnum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"


class DeliverableType(StrEnum):
    REEL = "reel"
    CAROUSEL = "carousel"
    STORY = "story"
    STATIC_POST = "static_post"
    SHOOT_DAY = "shoot_day"


class DeliverableStatus(StrEnum):
    DRAFT = "draft"
    IN_PRODUCTION = "in_production"
    PENDING_QA = "pending_qa"
    QA_REJECTED = "qa_rejected"
    PENDING_APPROVAL = "pending_approval"
    REVISION_REQUESTED = "revision_requested"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    PUBLISH_FAILED = "publish_failed"
    ARCHIVED = "archived"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    IN_PRODUCTION = "in_production"
    INTERNAL_QA = "internal_qa"
    CLIENT_REVIEW = "client_review"
    READY_TO_PUBLISH = "ready_to_publish"
    COMPLETED = "completed"


class TicketStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_ON_CLIENT = "waiting_on_client"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class TicketPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class PaymentProvider(StrEnum):
    RAZORPAY = "razorpay"
    STRIPE = "stripe"
    MANUAL = "manual"
