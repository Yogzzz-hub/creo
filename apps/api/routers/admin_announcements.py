from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.announcement import Announcement
from schemas.announcement import AnnouncementCreate, AnnouncementResponse, TargetAudience

router = APIRouter(prefix="/api/v1/admin", tags=["admin-announcements"])


def _map_audience_to_type(audience: TargetAudience) -> str:
    mapping = {
        TargetAudience.all: "general",
        TargetAudience.clients: "newsletter",
        TargetAudience.team: "mom",
    }
    return mapping.get(audience, "general")


def _map_audience_to_departments(audience: TargetAudience) -> list[str] | None:
    if audience == TargetAudience.clients:
        return ["client"]
    if audience == TargetAudience.team:
        return None
    return None


@router.get("/announcements", response_model=list[AnnouncementResponse])
async def list_announcements(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Announcement).order_by(Announcement.created_at.desc())
    )
    announcements = result.scalars().all()

    return [
        AnnouncementResponse(
            id=a.id,
            author_id=a.author_id,
            title=a.title,
            content=a.content,
            type=a.type,
            target_departments=a.target_departments,
            created_at=a.created_at,
        )
        for a in announcements
    ]


@router.post(
    "/announcements",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_announcement(
    payload: AnnouncementCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    announcement = Announcement(
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
        type=_map_audience_to_type(payload.target_audience),
        target_departments=_map_audience_to_departments(payload.target_audience),
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    return AnnouncementResponse(
        id=announcement.id,
        author_id=announcement.author_id,
        title=announcement.title,
        content=announcement.content,
        type=announcement.type,
        target_departments=announcement.target_departments,
        created_at=announcement.created_at,
    )


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()

    if announcement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found",
        )

    await db.delete(announcement)
    await db.commit()
