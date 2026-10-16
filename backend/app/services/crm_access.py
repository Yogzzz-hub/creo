"""Shared tenant and ownership rules for both existing and revenue CRM routes."""

from sqlalchemy import and_, or_, select
from app.core.errors import Forbidden
from app.models.enums import UserRole
from app.models.user import StaffProfile
from app.models.tenant import Team, TeamMember

EXECUTIVES = {UserRole.SALES, UserRole.BDE}
MANAGERS = {UserRole.BDE_HEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN}


def owner_ids(actor):
    reports = select(StaffProfile.user_id).where(
        StaffProfile.agency_id == actor.agency_id, StaffProfile.team_lead_id == actor.user_id
    )
    members = (
        select(TeamMember.user_id)
        .join(Team, Team.id == TeamMember.team_id)
        .where(
            Team.agency_id == actor.agency_id,
            Team.lead_id == actor.user_id,
            Team.is_active.is_(True),
        )
    )
    return reports.union(
        members, select(StaffProfile.user_id).where(StaffProfile.user_id == actor.user_id)
    )


def scope(actor, agency_column, owner_column=None):
    if actor.role not in EXECUTIVES | MANAGERS:
        raise Forbidden("Your role cannot access the revenue workspace.")
    if not actor.agency_id:
        raise Forbidden("Select an agency before accessing CRM records.")
    tenant = agency_column == actor.agency_id
    if actor.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return tenant
    if owner_column is None:
        return tenant
    if actor.role == UserRole.BDE_HEAD:
        return and_(tenant, or_(owner_column == actor.user_id, owner_column.in_(owner_ids(actor))))
    return and_(tenant, owner_column == actor.user_id)


def require_manager(actor):
    if actor.role not in MANAGERS:
        raise Forbidden("A BDE head or administrator must perform this action.")


def require_admin(actor):
    if actor.role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        raise Forbidden("Only an agency administrator can change CRM configuration.")
