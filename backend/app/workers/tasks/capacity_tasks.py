"""Capacity background tasks.

Includes nightly rebalancing to move clients from over-committed staff.
"""

import logging
import uuid
from typing import Any

from sqlalchemy import select, func, text

from app.db.session import async_session_factory, tenant_session
from app.workers.celery_app import celery_app
from app.models.tenant import TeamMember
from app.models.user import StaffProfile
from app.models.work import ClientAssignment, ClientCycle
from app.models.enums import CycleStatus

logger = logging.getLogger(__name__)

async def _get_active_agencies() -> list[uuid.UUID]:
    async with async_session_factory() as db:
        res = await db.execute(text("SELECT id FROM agencies WHERE status = 'active'"))
        return [uuid.UUID(str(row[0])) for row in res.fetchall()]

async def rebalance_agency_async(agency_id: uuid.UUID) -> int:
    """Rebalance staff assignments for an agency."""
    from app.services.capacity_service import committed_points, allocate_client

    moved_count = 0
    async with async_session_factory() as db:
        async with tenant_session(db, agency_id=agency_id):
            # Find over-committed staff members
            staff_stmt = select(StaffProfile)
            staff_members = (await db.execute(staff_stmt)).scalars().all()
            
            for staff in staff_members:
                committed = await committed_points(db, staff.user_id)
                if committed > staff.monthly_points:
                    # Over-committed. Find most recently assigned client that is not in an active cycle
                    assignments_stmt = (
                        select(ClientAssignment)
                        .where(ClientAssignment.user_id == staff.user_id)
                        .order_by(ClientAssignment.created_at.desc())
                    )
                    assignments = (await db.execute(assignments_stmt)).scalars().all()
                    
                    for assignment in assignments:
                        # Check if client has an active cycle
                        cycle_stmt = select(ClientCycle).where(
                            ClientCycle.client_id == assignment.client_id,
                            ClientCycle.status == CycleStatus.ACTIVE
                        )
                        active_cycle = (await db.execute(cycle_stmt)).scalar_one_or_none()
                        
                        if not active_cycle:
                            # Move this client's assignment
                            # 1. Delete assignment
                            client_id = assignment.client_id
                            role = assignment.craft_role
                            
                            # We can just unassign them and let allocate_client run
                            await db.delete(assignment)
                            await db.commit()
                            
                            # 2. Find the client's plan to pass to allocate_client
                            # This requires the subscription logic
                            from app.models.billing import Subscription, SubscriptionStatus
                            sub_stmt = select(Subscription).where(
                                Subscription.client_id == client_id,
                                Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
                            )
                            sub = (await db.execute(sub_stmt)).scalars().first()
                            
                            if sub:
                                await allocate_client(db, client_id, sub.plan_id)
                                moved_count += 1
                            break # Only move one per night per overcommitted staff to avoid thrashing
                            
    return moved_count


async def run_rebalancing_async() -> int:
    total_moved = 0
    agencies = await _get_active_agencies()
    for agency_id in agencies:
        try:
            moved = await rebalance_agency_async(agency_id)
            total_moved += moved
        except Exception as e:
            logger.error("Failed to rebalance agency %s: %s", agency_id, e)
            
    logger.info("Rebalanced %d clients across all agencies", total_moved)
    return total_moved

def run_async_safe(coro: Any) -> Any:
    """Run an async coroutine safely from sync Celery worker threads."""
    import asyncio
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)

@celery_app.task(name="app.workers.tasks.capacity_tasks.nightly_rebalancing_task", queue="default")
def nightly_rebalancing_task() -> int:
    return int(run_async_safe(run_rebalancing_async()))
