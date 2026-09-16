"""Platform router for super admins to manage agencies and view metrics."""

from __future__ import annotations

import uuid
from typing import Any
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db, tenant_session
from app.models.tenant import Agency, Team, TeamMember
from app.models.user import User
from app.models.billing import Plan, PlatformSubscription
from app.models.enums import SubscriptionStatus, UserRole
from app.core.rbac import Actor, get_current_actor
from app.core.security import hash_password
from app.core.errors import Unauthorized, Forbidden, NotFound

router = APIRouter(prefix="/platform", tags=["Platform"])

class SuperAdminActor(Actor):
    pass

async def require_super_admin(
    actor: Actor = Depends(get_current_actor),
) -> Actor:
    """Ensure the user is a super admin."""
    if actor.role != "super_admin":
        raise Forbidden("Super admin access required")
    return actor


class CreateAgencyRequest(BaseModel):
    name: str
    slug: str
    admin_email: str
    admin_name: str
    admin_password: str
    plan_tier: str = "starter"

class UpdateAgencyRequest(BaseModel):
    name: str | None = None
    slug: str | None = None
    custom_domain: str | None = None
    status: str | None = None
    max_clients: int | None = None
    max_staff: int | None = None
    branding: dict[str, Any] | None = None
    
@router.post("/agencies", response_model=dict[str, Any])
async def provision_agency(
    req: CreateAgencyRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> dict[str, Any]:
    """Provision a new agency, its first admin, default team, and default plans."""
    # 1. Create agency
    agency = Agency(
        id=uuid.uuid4(),
        name=req.name,
        slug=req.slug,
        status="trial",
        plan_tier=req.plan_tier,
    )
    db.add(agency)
    
    # 2. Create admin user
    admin_user = User(
        id=uuid.uuid4(),
        email=req.admin_email,
        full_name=req.admin_name,
        hashed_password=hash_password(req.admin_password),
        role=UserRole.ADMIN,
        agency_id=agency.id,
        is_active=True,
    )
    db.add(admin_user)
    
    # 3. Create default team
    team = Team(
        id=uuid.uuid4(),
        agency_id=agency.id,
        name="Main Team",
        lead_id=admin_user.id,
        is_active=True,
    )
    db.add(team)
    
    # 4. Add admin to team
    team_member = TeamMember(
        team_id=team.id,
        user_id=admin_user.id,
        is_home=True,
    )
    db.add(team_member)
    
    # 5. Create default plans (seeded from templates)
    starter = Plan(
        id=uuid.uuid4(),
        agency_id=agency.id,
        name="Starter",
        display_name="Starter Tier",
        monthly_price=500,
        poster_quota=8,
        reel_quota=4,
        story_quota=10
    )
    db.add(starter)
    
    accelerator = Plan(
        id=uuid.uuid4(),
        agency_id=agency.id,
        name="Accelerator",
        display_name="Accelerator Tier",
        monthly_price=1000,
        poster_quota=16,
        reel_quota=8,
        story_quota=20
    )
    db.add(accelerator)
    
    await db.commit()
    
    return {
        "status": "success",
        "agency_id": str(agency.id),
        "admin_id": str(admin_user.id)
    }

@router.get("/agencies")
async def list_agencies(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> list[dict[str, Any]]:
    """List all agencies (Platform view)."""
    # This queries globally across agencies, so it should run as platform admin
    # By default, endpoints run with the RLS of the current user. Since this is super admin,
    # the get_db dependency might set agency_id to None and user_role to super_admin.
    # The current_agency() function returns None, is_platform_admin() returns True.
    # We must ensure get_db sets app.user_role to 'super_admin' if the user is a super admin.
    
    stmt = select(Agency)
    agencies = (await db.execute(stmt)).scalars().all()
    return [{"id": str(a.id), "name": a.name, "slug": a.slug, "status": a.status, "plan": a.plan_tier} for a in agencies]


@router.patch("/agencies/{agency_id}")
async def update_agency(
    agency_id: uuid.UUID,
    req: UpdateAgencyRequest,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> dict[str, Any]:
    agency = await db.get(Agency, agency_id)
    if not agency:
        raise NotFound("Agency not found")
        
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(agency, k, v)
        
    await db.commit()
    return {"status": "success", "agency_id": str(agency.id)}


@router.post("/agencies/{agency_id}/suspend")
async def suspend_agency(
    agency_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> dict[str, Any]:
    agency = await db.get(Agency, agency_id)
    if not agency:
        raise NotFound("Agency not found")
        
    agency.status = "suspended"
    await db.commit()
    return {"status": "suspended", "agency_id": str(agency.id)}


@router.post("/agencies/{agency_id}/impersonate")
async def impersonate_agency(
    agency_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> dict[str, Any]:
    """Time-boxed, read-only impersonation."""
    # We create a temporary JWT token for the admin to impersonate an agency user
    # 1. Find an admin of that agency
    stmt = select(User).where(User.agency_id == agency_id, User.role == "admin").limit(1)
    target_user = (await db.execute(stmt)).scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(400, "No admin user found in that agency to impersonate")
        
    from app.core.security import create_access_token
    
    # 30-minute expiry
    access_token = create_access_token(
        subject=str(target_user.id),
        role=target_user.role.value,
        email=target_user.email,
        agency_id=str(target_user.agency_id),
        expires_delta=timedelta(minutes=30),
        extra_claims={
            "token_version": target_user.token_version,
            "impersonator_id": str(actor.user_id),
            "is_read_only": True,
        }
    )
    
    # Audit logging
    from app.models.ops import AuditLog
    audit = AuditLog(
        id=uuid.uuid4(),
        actor_id=actor.user_id,
        actor_role="super_admin",
        entity="agency",
        entity_id=agency_id,
        action="impersonate_agency",
        created_at=datetime.now(UTC),
    )
    db.add(audit)
    await db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "impersonated_user_id": str(target_user.id),
        "expires_in_minutes": 30
    }


@router.get("/metrics")
async def platform_metrics(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> dict[str, Any]:
    """Metrics across all agencies."""
    agency_count = await db.scalar(select(func.count(Agency.id)))
    # For MRR, we can sum PlatformSubscription amounts
    mrr = await db.scalar(select(func.coalesce(func.sum(PlatformSubscription.amount), 0)).where(PlatformSubscription.status == SubscriptionStatus.ACTIVE))
    
    return {
        "total_agencies": agency_count,
        "mrr": float(mrr) if mrr is not None else 0.0
    }

@router.get("/audit")
async def platform_audit_log(
    db: AsyncSession = Depends(get_db),
    actor: Actor = Depends(require_super_admin),
) -> list[dict[str, Any]]:
    from app.models.ops import AuditLog
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)
    logs = (await db.execute(stmt)).scalars().all()
    return [{"id": str(log.id), "action": log.action, "entity": log.entity, "created_at": log.created_at.isoformat()} for log in logs]
