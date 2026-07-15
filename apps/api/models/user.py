from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.enums import AccountStatus, PlanName, UserRole

if TYPE_CHECKING:
    from models.subscription import Subscription
    from models.questionnaire import Questionnaire
    from models.team import TeamMember
    from models.client_assignment import ClientAssignment
    from models.content_plan import ContentPlan
    from models.content_calendar import ContentCalendar
    from models.task import Task
    from models.deliverable import Deliverable, DeliverableComment
    from models.ticket import Ticket, TicketMessage
    from models.addon import Addon
    from models.notification import Notification
    from models.escalation import Escalation
    from models.announcement import Announcement
    from models.custom_pricing import CustomPricing
    from models.leave import LeaveRequest


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default="gen_random_uuid()"
    )
    auth_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    business_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=False), nullable=False, default=UserRole.client
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status", create_type=False),
        nullable=False,
        default=AccountStatus.pending_verification,
    )
    plan_name: Mapped[Optional[PlanName]] = mapped_column(
        Enum(PlanName, name="plan_name", create_type=False), nullable=True
    )
    instagram_access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instagram_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instagram_username: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    two_fa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    instagram_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    brand_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships
    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="user", lazy="selectin"
    )
    questionnaire: Mapped[Optional["Questionnaire"]] = relationship(
        "Questionnaire", back_populates="user", uselist=False, lazy="selectin"
    )
    team_member: Mapped[Optional["TeamMember"]] = relationship(
        "TeamMember", back_populates="user", uselist=False, lazy="selectin"
    )
    client_assignments: Mapped[list["ClientAssignment"]] = relationship(
        "ClientAssignment",
        back_populates="client",
        foreign_keys="ClientAssignment.client_id",
        lazy="selectin",
    )
    assigned_by_assignments: Mapped[list["ClientAssignment"]] = relationship(
        "ClientAssignment",
        foreign_keys="ClientAssignment.assigned_by",
        lazy="selectin",
    )
    content_plans: Mapped[list["ContentPlan"]] = relationship(
        "ContentPlan", back_populates="client", lazy="selectin"
    )
    content_calendar_entries: Mapped[list["ContentCalendar"]] = relationship(
        "ContentCalendar", back_populates="client", lazy="selectin"
    )
    tasks_as_client: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="client",
        foreign_keys="Task.client_id",
        lazy="selectin",
    )
    deliverables: Mapped[list["Deliverable"]] = relationship(
        "Deliverable", back_populates="client", lazy="selectin"
    )
    deliverable_comments: Mapped[list["DeliverableComment"]] = relationship(
        "DeliverableComment", back_populates="author", lazy="selectin"
    )
    tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="client", foreign_keys="Ticket.client_id", lazy="selectin"
    )
    ticket_messages_sent: Mapped[list["TicketMessage"]] = relationship(
        "TicketMessage", back_populates="sender", lazy="selectin"
    )
    addons: Mapped[list["Addon"]] = relationship(
        "Addon", back_populates="client", foreign_keys="Addon.client_id", lazy="selectin"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", lazy="selectin"
    )
    escalations_as_client: Mapped[list["Escalation"]] = relationship(
        "Escalation",
        foreign_keys="Escalation.client_id",
        lazy="selectin",
    )
    escalations_assigned: Mapped[list["Escalation"]] = relationship(
        "Escalation",
        foreign_keys="Escalation.assigned_to",
        lazy="selectin",
    )
    escalations_resolved: Mapped[list["Escalation"]] = relationship(
        "Escalation",
        foreign_keys="Escalation.resolved_by",
        lazy="selectin",
    )
    announcements: Mapped[list["Announcement"]] = relationship(
        "Announcement", back_populates="author", lazy="selectin"
    )
    custom_pricing_requests: Mapped[list["CustomPricing"]] = relationship(
        "CustomPricing",
        foreign_keys="CustomPricing.client_id",
        lazy="selectin",
    )
    custom_pricing_requested: Mapped[list["CustomPricing"]] = relationship(
        "CustomPricing",
        foreign_keys="CustomPricing.requested_by",
        lazy="selectin",
    )
    custom_pricing_approved: Mapped[list["CustomPricing"]] = relationship(
        "CustomPricing",
        foreign_keys="CustomPricing.approved_by",
        lazy="selectin",
    )
    leave_requests_reviewed: Mapped[list["LeaveRequest"]] = relationship(
        "LeaveRequest",
        foreign_keys="LeaveRequest.reviewed_by",
        lazy="selectin",
    )
