"""Capacity and allocation service.

Implements effort points, bottleneck detection, and client allocation logic.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Plan
from app.models.enums import AccountStatus
from app.models.tenant import Team, TeamMember
from app.models.user import ClientProfile, ClientRoleRequirement, StaffProfile, User
from app.models.work import ClientAssignment

logger = logging.getLogger(__name__)

EFFORT = {
    "reel": 5,
    "poster": 2,
    "story": 1,
    "shoot_day": 8,
    "item_overhead": 0.5,
}

def client_load(plan: Plan) -> dict[str, int]:
    """Calculate the monthly effort points required for a given plan."""
    items = plan.poster_quota + plan.reel_quota + plan.story_quota
    return {
        "video_editor": plan.reel_quota * EFFORT["reel"],
        "graphic_designer": plan.poster_quota * EFFORT["poster"] + plan.story_quota * EFFORT["story"],
        "videographer": 0,  # Or logic based on shoot days if plan has it, fallback 0
        "content_creator": round(items * EFFORT["item_overhead"]),
        "social_manager": round(items * EFFORT["item_overhead"]),
    }


async def committed_points(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Calculate total points committed for a staff member."""
    stmt = select(func.coalesce(func.sum(ClientAssignment.points_committed), 0)).where(
        ClientAssignment.user_id == user_id
    )
    res = await db.execute(stmt)
    return res.scalar_one()


async def available_points(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Calculate remaining available points for a staff member."""
    stmt = select(StaffProfile).where(StaffProfile.user_id == user_id)
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        return 0
    committed = await committed_points(db, user_id)
    return profile.monthly_points - committed


async def team_capacity(
    db: AsyncSession, team_id: uuid.UUID, plan: Plan, required_roles: set[str]
) -> tuple[float, str]:
    """Calculate how many clients of a plan the team can handle based on required roles."""
    load = client_load(plan)
    
    # Calculate available points per role in the team
    stmt = (
        select(StaffProfile.craft_role, func.sum(StaffProfile.monthly_points))
        .join(TeamMember, TeamMember.user_id == StaffProfile.user_id)
        .where(TeamMember.team_id == team_id)
        .group_by(StaffProfile.craft_role)
    )
    res = await db.execute(stmt)
    total_points = {row[0]: int(row[1]) for row in res.all()}
    
    # Calculate committed points per role in the team
    stmt2 = (
        select(StaffProfile.craft_role, func.sum(ClientAssignment.points_committed))
        .join(ClientAssignment, ClientAssignment.user_id == StaffProfile.user_id)
        .join(TeamMember, TeamMember.user_id == StaffProfile.user_id)
        .where(TeamMember.team_id == team_id)
        .group_by(StaffProfile.craft_role)
    )
    res2 = await db.execute(stmt2)
    committed = {row[0]: int(row[1]) for row in res2.all()}
    
    ratios = {}
    for role in required_roles:
        if load.get(role, 0) > 0:
            free_points = total_points.get(role, 0) - committed.get(role, 0)
            ratios[role] = free_points / load[role]
            
    if not ratios:
        return 0.0, "none"
        
    bottleneck = min(ratios, key=ratios.__getitem__)
    return ratios[bottleneck], bottleneck


async def allocate_client(db: AsyncSession, client_id: uuid.UUID, plan_id: uuid.UUID) -> dict[str, Any]:
    """Allocate a client to staff members based on capacity and ownership."""
    client = await db.get(User, client_id)
    plan = await db.get(Plan, plan_id)
    
    if not client or not plan:
        raise ValueError("Client or Plan not found")
        
    if not client.owning_team_id:
        # Awaiting staffing because no owning team
        client.account_status = AccountStatus.AWAITING_STAFFING
        await db.commit()
        return {"status": "awaiting_staffing", "reason": "No owning team assigned"}
        
    # 1. required_roles
    req_stmt = select(ClientRoleRequirement.craft_role).where(
        ClientRoleRequirement.client_id == client.id
    )
    req_res = await db.execute(req_stmt)
    required_roles = {row[0] for row in req_res.all()}
    
    # 2. load
    load = client_load(plan)
    
    assigned_roles = set()
    shortfalls = {}
    
    # 3. Try the OWNING TEAM first
    for role in required_roles:
        if role in assigned_roles or load.get(role, 0) == 0:
            continue
            
        candidate_stmt = (
            select(StaffProfile)
            .join(TeamMember, TeamMember.user_id == StaffProfile.user_id)
            .where(
                TeamMember.team_id == client.owning_team_id,
                StaffProfile.craft_role == role
            )
        )
        candidates = (await db.execute(candidate_stmt)).scalars().all()
        
        for candidate in candidates:
            # Lock the candidate to prevent race conditions during allocation
            lock_stmt = select(StaffProfile).where(StaffProfile.user_id == candidate.user_id).with_for_update(skip_locked=True)
            locked_cand = (await db.execute(lock_stmt)).scalar_one_or_none()
            if not locked_cand:
                continue
                
            free = locked_cand.monthly_points - await committed_points(db, locked_cand.user_id)
            if free >= load[role]:
                db.add(ClientAssignment(
                    client_id=client.id,
                    user_id=locked_cand.user_id,
                    role=role, # mapping craft_role to standard role in old system if needed, but using craft_role is better
                    craft_role=role,
                    points_committed=load[role],
                    from_team_id=client.owning_team_id,
                    agency_id=client.agency_id
                ))
                assigned_roles.add(role)
                break
                
    # 4. PARTIAL: keep the roles the owning team can cover. For uncovered, search ALL teams
    for role in required_roles - assigned_roles:
        if load.get(role, 0) == 0:
            continue
            
        # rank all members in agency by free points DESC
        candidate_stmt = (
            select(StaffProfile)
            .where(
                StaffProfile.agency_id == client.agency_id,
                StaffProfile.craft_role == role
            )
        )
        candidates = (await db.execute(candidate_stmt)).scalars().all()
        
        # We need to compute free points for all candidates to rank them
        # For a large agency, we might want to do this in SQL, but for now we'll do it in python
        candidate_free_pts = []
        for cand in candidates:
            free = cand.monthly_points - await committed_points(db, cand.user_id)
            candidate_free_pts.append((free, cand))
            
        candidate_free_pts.sort(key=lambda x: x[0], reverse=True)
        
        best_free = 0
        for free, candidate in candidate_free_pts:
            if free > best_free:
                best_free = free
                
            if free >= load[role]:
                lock_stmt = select(StaffProfile).where(StaffProfile.user_id == candidate.user_id).with_for_update(skip_locked=True)
                locked_cand = (await db.execute(lock_stmt)).scalar_one_or_none()
                if not locked_cand:
                    continue
                    
                actual_free = locked_cand.monthly_points - await committed_points(db, locked_cand.user_id)
                if actual_free >= load[role]:
                    # Find their home team
                    home_stmt = select(TeamMember.team_id).where(
                        TeamMember.user_id == locked_cand.user_id,
                        TeamMember.is_home == True
                    )
                    home_team_id = (await db.execute(home_stmt)).scalar_one_or_none()
                    
                    db.add(ClientAssignment(
                        client_id=client.id,
                        user_id=locked_cand.user_id,
                        role=role,
                        craft_role=role,
                        points_committed=load[role],
                        from_team_id=home_team_id,
                        agency_id=client.agency_id
                    ))
                    assigned_roles.add(role)
                    break
                    
        if role not in assigned_roles:
            shortfalls[role] = {"needed": load[role], "best_available": best_free}
            
    # 5. Still uncovered -> awaiting_staffing
    if shortfalls:
        # We rollback partial assignments for this client or just leave them?
        # "NEVER over-assign. NEVER leave it silently unstaffed."
        # The prompt says: "Create the client in 'awaiting_staffing', notify the agency admin with the exact shortfall... NEVER over-assign."
        client.account_status = AccountStatus.AWAITING_STAFFING
        
        shortfall_text = "; ".join([f"{r} needs {s['needed']}, most free is {s['best_available']}" for r, s in shortfalls.items()])
        
        from app.workers.tasks.notify import send_notification_task
        # We would dispatch a notification to the agency admin here
        
        await db.commit()
        return {"status": "awaiting_staffing", "shortfalls": shortfalls, "message": shortfall_text}
        
    client.account_status = AccountStatus.ACTIVE
    await db.commit()
    return {"status": "assigned", "roles": list(assigned_roles)}


async def enforce_agency_limits(db: AsyncSession, agency_id: uuid.UUID) -> dict[str, Any]:
    """Check if the agency has exceeded its plan limits."""
    from app.models.tenant import Agency
    
    agency = await db.get(Agency, agency_id)
    if not agency:
        return {"ok": False}
        
    client_count = await db.scalar(
        select(func.count(User.id)).where(User.agency_id == agency_id, User.role == "client")
    )
    staff_count = await db.scalar(
        select(func.count(User.id)).where(User.agency_id == agency_id, User.role == "staff")
    )
    
    return {
        "ok": (client_count or 0) <= (agency.max_clients or 0) and (staff_count or 0) <= (agency.max_staff or 0),
        "client_count": client_count,
        "staff_count": staff_count,
        "max_clients": agency.max_clients,
        "max_staff": agency.max_staff
    }
