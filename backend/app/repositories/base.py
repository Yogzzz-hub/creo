"""Base repository and tenant-scoped domain repositories.

Per CLAUDE.md Invariant 15:
Every repository read method takes scope: TenantScope as a keyword-only argument
and filters on it. There is no way to query deliverables without saying whose.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Generic, TypeVar

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.enums import DeliverableStatus, TaskStatus, UserRole
from app.models.work import Deliverable, Task

T = TypeVar("T", bound=Base)


@dataclass(frozen=True)
class TenantScope:
    """Explicit tenant and actor authorization context."""

    client_id: uuid.UUID | None
    user_id: uuid.UUID
    role: UserRole


class BaseRepository(Generic[T]):
    """Abstract base repository enforcing tenant scoping."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session


class DeliverableRepository(BaseRepository[Deliverable]):
    """Tenant-scoped repository for deliverables."""

    async def get_by_id(
        self,
        deliverable_id: uuid.UUID,
        *,
        scope: TenantScope,
    ) -> Deliverable | None:
        """Fetch deliverable strictly within the caller's tenant scope."""
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id)

        # Clients only see their own deliverables
        if scope.role == UserRole.CLIENT:
            if not scope.client_id:
                return None
            stmt = stmt.where(Deliverable.client_id == scope.client_id)
        elif scope.client_id:
            # Scoped staff / admin filter
            stmt = stmt.where(Deliverable.client_id == scope.client_id)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_deliverables(
        self,
        *,
        scope: TenantScope,
        status: DeliverableStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Deliverable]:
        """Query deliverables enforcing role boundaries and tenant filtering."""
        stmt = select(Deliverable)

        filters = []
        if scope.role == UserRole.CLIENT:
            if not scope.client_id:
                return []
            filters.append(Deliverable.client_id == scope.client_id)
        elif scope.client_id:
            filters.append(Deliverable.client_id == scope.client_id)

        if status:
            filters.append(Deliverable.status == status)

        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.order_by(Deliverable.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class TaskRepository(BaseRepository[Task]):
    """Tenant-scoped repository for production tasks."""

    async def get_by_id(
        self,
        task_id: uuid.UUID,
        *,
        scope: TenantScope,
    ) -> Task | None:
        """Fetch task within caller's scope."""
        stmt = select(Task).where(Task.id == task_id)

        if scope.role == UserRole.CLIENT:
            if not scope.client_id:
                return None
            stmt = stmt.where(Task.client_id == scope.client_id)
        elif scope.role in (UserRole.EDITOR, UserRole.DESIGNER):
            # Creatives only see assigned tasks unless client_id is explicitly targeted
            stmt = stmt.where(Task.assigned_to == scope.user_id)
        elif scope.client_id:
            stmt = stmt.where(Task.client_id == scope.client_id)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_tasks(
        self,
        *,
        scope: TenantScope,
        status: TaskStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Task]:
        """Query tasks matching scope."""
        stmt = select(Task)
        filters = []

        if scope.role == UserRole.CLIENT:
            if not scope.client_id:
                return []
            filters.append(Task.client_id == scope.client_id)
        elif scope.role in (UserRole.EDITOR, UserRole.DESIGNER):
            filters.append(Task.assigned_to == scope.user_id)
        elif scope.client_id:
            filters.append(Task.client_id == scope.client_id)

        if status:
            filters.append(Task.status == status)

        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
