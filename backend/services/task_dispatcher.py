import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.enums import Department, DeliverableType, TaskStatus
from models.task import Task
from models.task_history import TaskStatusHistory
from models.team import TeamMember

logger = logging.getLogger(__name__)

MAP_DELIVERABLE_TO_DEPARTMENT = {
    DeliverableType.poster: Department.graphics,
    DeliverableType.story: Department.graphics,
    DeliverableType.reel: Department.video,
    DeliverableType.shoot_day: Department.video,
}


async def dispatch_task(db: AsyncSession, task_id: str, department_id: str) -> Optional[str]:
    """
    Auto-assigns the task to a team member in the matching department with the lowest active task count.
    If no match is found, leaves it unassigned (None).
    """
    try:
        try:
            dept = Department(department_id)
        except ValueError:
            logger.warning("Invalid department_id passed to dispatch_task: %s", department_id)
            return None

        result = await db.execute(
            select(TeamMember).where(
                TeamMember.department == dept,
                TeamMember.is_active == True
            )
        )
        team_members = result.scalars().all()

        if not team_members:
            logger.info("dispatch_task: No active team members found in department %s", department_id)
            return None

        best_member = None
        min_active_count = float("inf")

        for member in team_members:
            count_result = await db.execute(
                select(func.count(Task.id)).where(
                    Task.assigned_to == member.id,
                    Task.status != TaskStatus.approved
                )
            )
            count = count_result.scalar() or 0
            if count < min_active_count:
                min_active_count = count
                best_member = member

        if best_member:
            task_result = await db.execute(
                select(Task).where(Task.id == task_id)
            )
            task = task_result.scalar_one_or_none()
            if task:
                old_status = task.status
                task.assigned_to = best_member.id
                task.assignment_date = datetime.now(timezone.utc).date()
                task.status = TaskStatus.pending

                history = TaskStatusHistory(
                    task_id=task.id,
                    changed_by_user_id=best_member.user_id,  # Assigned user ID as trigger context or None
                    old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
                    new_status=TaskStatus.pending.value,
                )
                db.add(history)
                logger.info(
                    "dispatch_task: Task %s auto-assigned to team member %s (active task count: %d)",
                    task_id,
                    best_member.id,
                    min_active_count,
                )
                return best_member.id

        return None
    except Exception:
        logger.exception("Error during auto-assignment dispatch for task %s", task_id)
        return None


async def auto_assign_task(db: AsyncSession, task: Task) -> Optional[str]:
    """
    Auto-assigns the task based on its deliverable type to department mappings.
    """
    dept = MAP_DELIVERABLE_TO_DEPARTMENT.get(task.deliverable_type)
    if not dept:
        logger.warning("No department mapping found for deliverable type: %s", task.deliverable_type)
        return None
    return await dispatch_task(db, task.id, dept.value)
