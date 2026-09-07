"""Notifications router: multi-channel user alerts and real-time updates."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.ops import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    link: str | None = None


@router.get("", response_model=dict[str, Any])
async def list_notifications(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve notifications and unread badge count for current actor."""
    target_user_id = actor.user_id

    # Fetch recent 20 notifications
    stmt = (
        select(Notification)
        .where(Notification.user_id == target_user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    # Unread count
    unread_stmt = select(func.count(Notification.id)).where(
        Notification.user_id == target_user_id,
        Notification.is_read.is_(False),
    )
    unread_count = (await db.execute(unread_stmt)).scalar() or 0

    return {
        "unread_count": unread_count,
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
    }


@router.patch("/{notification_id}/read", response_model=dict[str, Any])
async def mark_notification_read(
    notification_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Mark a notification as read."""
    notif = await db.get(Notification, notification_id)
    if not notif or notif.user_id != actor.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    return {"status": "ok", "id": str(notification_id), "is_read": True}


@router.post("/mark-all-read", response_model=dict[str, Any])
async def mark_all_read(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Mark all notifications as read for current actor."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == actor.user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "all_marked_read"}


@router.post("/send", response_model=dict[str, Any])
async def send_notification(
    payload: SendNotificationRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Send a notification to a specific user (e.g., review request or support feedback)."""
    new_notif = Notification(
        user_id=payload.user_id,
        title=payload.title,
        message=payload.message,
        link=payload.link,
        is_read=False,
    )
    db.add(new_notif)
    await db.commit()
    return {"status": "sent", "id": str(new_notif.id)}
