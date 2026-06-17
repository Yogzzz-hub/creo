from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireTeamMember
from models.content_calendar import ContentCalendar
from models.task import Task
from models.team import TeamMember
from models.user import User
from schemas.team_calendar import TeamCalendarEntryResponse

router = APIRouter(prefix="/api/v1/calendar/team", tags=["team-calendar"])


@router.get("", response_model=list[TeamCalendarEntryResponse])
async def list_team_calendar_entries(
    current_user: RequireTeamMember,
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    )
    team_member = team_result.scalar_one_or_none()

    if team_member is None:
        return []

    result = await db.execute(
        select(ContentCalendar)
        .join(Task, ContentCalendar.linked_task_id == Task.id)
        .where(Task.assigned_to == team_member.id)
        .order_by(ContentCalendar.scheduled_date.asc())
    )
    entries = result.scalars().all()

    response = []
    for entry in entries:
        client_result = await db.execute(
            select(User.full_name, User.business_name).where(User.id == entry.client_id)
        )
        client_row = client_result.first()
        client_name = ""
        if client_row:
            client_name = client_row.business_name or client_row.full_name

        display_date = entry.scheduled_date - timedelta(days=1)

        response.append(
            TeamCalendarEntryResponse(
                id=entry.id,
                scheduled_date=entry.scheduled_date,
                display_date=display_date,
                deliverable_type=entry.deliverable_type.value,
                client_name=client_name,
                status=entry.status.value,
                linked_task_id=entry.linked_task_id,
            )
        )

    return response
