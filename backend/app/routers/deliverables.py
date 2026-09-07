"""Deliverables API router — Phase 4.

All status mutations route through deliverable_state.transition() exclusively.
No other module may assign deliverable.status.

Endpoints:
    POST /deliverables/upload-intent      — presigned S3 PUT URL
    POST /deliverables/confirm            — HEAD-check and create Deliverable record
    POST /deliverables/{id}/submit-qa     — in_production → pending_qa (editor/designer)
    POST /deliverables/{id}/qa-approve    — pending_qa → pending_approval (team_lead+)
    POST /deliverables/{id}/qa-reject     — pending_qa → qa_rejected (team_lead+)
    POST /deliverables/{id}/approve       — pending_approval → approved (client, Idempotency-Key)
    POST /deliverables/{id}/request-changes — pending_approval → revision_requested (client)
    POST /deliverables/{id}/schedule      — approved → scheduled (staff)
    GET  /portal/deliverables             — keyset paginated, filter by status (client)
    GET  /deliverables/{id}/versions      — full root_id chain, newest first
"""

from __future__ import annotations

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import DeliverableStatus, DeliverableType, TaskStatus, UserRole
from app.models.work import Deliverable
from app.repositories.base import DeliverableRepository, TenantScope
from app.services import deliverable_state, storage_service
from app.services.subscription_guard import check_client_subscription, require_active_subscription

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/deliverables", tags=["Deliverables"])
portal_router = APIRouter(prefix="/portal", tags=["Portal"])


def _scope_from_actor(actor: Actor) -> TenantScope:
    return TenantScope(
        client_id=actor.client_id,
        user_id=actor.user_id,
        role=actor.role,
    )


async def _get_deliverable_or_404(
    deliverable_id: uuid.UUID,
    scope: TenantScope,
    db: AsyncSession,
) -> Deliverable:
    repo = DeliverableRepository(db)
    d = await repo.get_by_id(deliverable_id, scope=scope)
    if d is None:
        raise NotFound(f"Deliverable {deliverable_id} not found", code="DELIVERABLE_NOT_FOUND")
    return d


# ── Upload Intent ─────────────────────────────────────────────────────────────


@router.post("/upload-intent")
async def upload_intent(
    mime_type: str,
    file_size_bytes: int,
    deliverable_type: DeliverableType,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Validate MIME type + quota, then return a pre-signed S3 PUT URL.

    Consumes 1 quota unit optimistically. If the upload is never confirmed,
    the quota will be released by a background cleanup job.
    """
    if actor.role == UserRole.CLIENT:
        raise Forbidden("Clients may not upload deliverables directly", code="UPLOAD_FORBIDDEN")

    # Get client_id from scope (for staff uploading on behalf of a client)
    if not actor.client_id:
        raise Conflict("X-Client-Id header is required for staff uploads", code="MISSING_CLIENT_ID")
    target_client_id: uuid.UUID = actor.client_id

    try:
        intent = storage_service.upload_intent(target_client_id, mime_type, file_size_bytes)
    except storage_service.UnsupportedMimeType as exc:
        raise Conflict(str(exc), code="UNSUPPORTED_MIME_TYPE") from exc
    except storage_service.FileTooLarge as exc:
        raise Conflict(str(exc), code="FILE_TOO_LARGE") from exc

    return {
        **intent,
        "deliverable_type": deliverable_type.value,
        "client_id": str(target_client_id),
    }


# ── Confirm Upload ─────────────────────────────────────────────────────────────


@router.post("/confirm")
async def confirm_upload(
    storage_key: str,
    declared_size_bytes: int,
    deliverable_type: DeliverableType,
    client_id: uuid.UUID,
    task_id: uuid.UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """HEAD the S3 object, then create the Deliverable row if size matches."""
    if actor.role == UserRole.CLIENT:
        raise Forbidden("Clients may not confirm deliverable uploads", code="UPLOAD_FORBIDDEN")

    try:
        confirm_result = storage_service.confirm_upload(storage_key, declared_size_bytes)
    except storage_service.ObjectNotFound as exc:
        raise Conflict(str(exc), code="OBJECT_NOT_FOUND") from exc
    except storage_service.ContentLengthMismatch as exc:
        raise Conflict(str(exc), code="CONTENT_LENGTH_MISMATCH") from exc

    # Derive file type from storage key extension
    file_ext = storage_key.rsplit(".", 1)[-1].upper() if "." in storage_key else "UNKNOWN"
    raw_size = confirm_result.get("actual_size")
    actual_size = raw_size if isinstance(raw_size, int) else declared_size_bytes

    deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=uuid.uuid4(),
        version=1,
        client_id=client_id,
        task_id=task_id,
        submitted_by=actor.user_id,
        file_url=storage_key,
        file_type=file_ext,
        file_size_bytes=actual_size,
        status=DeliverableStatus.IN_PRODUCTION,
        revision_round=0,
    )
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)

    log.info(
        "deliverable_created",
        deliverable_id=str(deliverable.id),
        client_id=str(client_id),
        storage_key=storage_key,
    )
    return {
        "id": str(deliverable.id),
        "root_id": str(deliverable.root_id),
        "version": deliverable.version,
        "status": deliverable.status.value,
        "storage_key": storage_key,
    }


# ── Status Transition Endpoints ───────────────────────────────────────────────


@router.post("/{deliverable_id}/submit-qa")
async def submit_qa(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Editor/designer submits deliverable to internal QA. in_production → pending_qa."""
    if actor.role not in deliverable_state._STAFF_ROLES:
        raise Forbidden("Only staff may submit to QA", code="FORBIDDEN")
    # For staff, allow cross-client lookup by temporarily widening scope
    wide_scope = TenantScope(client_id=None, user_id=actor.user_id, role=actor.role)
    d = await _get_deliverable_or_404(deliverable_id, wide_scope, db)
    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.PENDING_QA,
        actor_id=actor.user_id,
        actor_role=actor.role,
        request_id=None,
    )
    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/qa-approve")
async def qa_approve(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Team lead approves QA. pending_qa → pending_approval."""
    wide_scope = TenantScope(client_id=None, user_id=actor.user_id, role=actor.role)
    d = await _get_deliverable_or_404(deliverable_id, wide_scope, db)
    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.PENDING_APPROVAL,
        actor_id=actor.user_id,
        actor_role=actor.role,
    )

    # Multi-Channel Alert: Notify client that deliverable (reel/poster) is ready for review
    from app.models.ops import Notification
    from app.models.work import Task
    deliv_type_label = "Reel" if "video" in (d.file_type or "") else "Poster"
    if d.task_id:
        task = await db.get(Task, d.task_id)
        if task and task.deliverable_type:
            deliv_type_label = task.deliverable_type.value.capitalize()

    db.add(
        Notification(
            user_id=d.client_id,
            title=f"🎬 Your {deliv_type_label} is Ready for Review",
            message="Our creative team has finished production. Please review, approve, or request revisions.",
            link="/portal/deliverables",
            is_read=False,
        )
    )
    await db.commit()

    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/qa-reject")
async def qa_reject(
    deliverable_id: uuid.UUID,
    qa_notes: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Team lead rejects in QA. pending_qa → qa_rejected. qa_notes required."""
    if not qa_notes.strip():
        raise Conflict("qa_notes is required for QA rejection", code="MISSING_QA_NOTES")
    wide_scope = TenantScope(client_id=None, user_id=actor.user_id, role=actor.role)
    d = await _get_deliverable_or_404(deliverable_id, wide_scope, db)
    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.QA_REJECTED,
        actor_id=actor.user_id,
        actor_role=actor.role,
        qa_notes=qa_notes,
    )
    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/approve")
async def approve_deliverable(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    _sub_guard: dict = Depends(require_active_subscription),
) -> dict[str, str]:
    """Client approves deliverable. pending_approval → approved. Idempotency-Key honoured."""
    scope = _scope_from_actor(actor)
    d = await _get_deliverable_or_404(deliverable_id, scope, db)

    # Idempotency: if already approved, return current state immediately
    if d.status == DeliverableStatus.APPROVED:
        log.info(
            "approve_idempotent",
            deliverable_id=str(deliverable_id),
            idempotency_key=idempotency_key,
        )
        return {"status": d.status.value, "deliverable_id": str(d.id), "idempotent": "true"}

    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.APPROVED,
        actor_id=actor.user_id,
        actor_role=actor.role,
        request_id=idempotency_key,
    )

    # Notify staff / team lead of client approval
    from app.models.ops import Notification
    from app.models.work import Task
    deliv_type_label = "Reel" if "video" in (d.file_type or "") else "Poster"
    assignee_id = d.submitted_by
    if d.task_id:
        task = await db.get(Task, d.task_id)
        if task:
            if task.deliverable_type:
                deliv_type_label = task.deliverable_type.value.capitalize()
            if task.assigned_to:
                assignee_id = task.assigned_to
            task.status = TaskStatus.READY_TO_PUBLISH

    if assignee_id:
        db.add(
            Notification(
                user_id=assignee_id,
                title="🎉 Deliverable Approved by Client!",
                message=f"The client approved the {deliv_type_label}.",
                link="/admin/queue",
                is_read=False,
            )
        )
        await db.commit()

    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/request-changes")
async def request_changes(
    deliverable_id: uuid.UUID,
    rejection_comment: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
    _sub_guard: dict = Depends(require_active_subscription),
) -> dict[str, object]:
    """Client requests changes. pending_approval → revision_requested. Comment required.

    On REVISION_LIMIT_REACHED, raises Conflict with code 'REVISION_LIMIT_REACHED'.
    The frontend should render a plan upsell dialog, not a red toast.
    """
    if not rejection_comment.strip():
        raise Conflict(
            "rejection_comment is required to request changes",
            code="MISSING_REJECTION_COMMENT",
        )
    scope = _scope_from_actor(actor)
    d = await _get_deliverable_or_404(deliverable_id, scope, db)
    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.REVISION_REQUESTED,
        actor_id=actor.user_id,
        actor_role=actor.role,
        reason=rejection_comment,
    )

    # Alert creator & team lead that client requested revisions/support
    from app.models.ops import Notification
    from app.models.work import Task
    deliv_type_label = "Reel" if "video" in (d.file_type or "") else "Poster"
    assignee_id = d.submitted_by
    if d.task_id:
        task = await db.get(Task, d.task_id)
        if task:
            if task.deliverable_type:
                deliv_type_label = task.deliverable_type.value.capitalize()
            if task.assigned_to:
                assignee_id = task.assigned_to
            task.status = TaskStatus.IN_PRODUCTION

    if assignee_id:
        db.add(
            Notification(
                user_id=assignee_id,
                title="⚠️ Revision Requested by Client",
                message=f"Changes requested on {deliv_type_label}: '{rejection_comment.strip()}'",
                link="/admin/queue",
                is_read=False,
            )
        )
        await db.commit()

    return {
        "status": d.status.value,
        "deliverable_id": str(d.id),
        "revision_round": d.revision_round,
    }


@router.post("/{deliverable_id}/schedule")
async def schedule_deliverable(
    deliverable_id: uuid.UUID,
    scheduled_at: datetime,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Staff schedules an approved deliverable. approved → scheduled."""
    wide_scope = TenantScope(client_id=None, user_id=actor.user_id, role=actor.role)
    d = await _get_deliverable_or_404(deliverable_id, wide_scope, db)
    d = await deliverable_state.transition(
        db,
        d,
        DeliverableStatus.SCHEDULED,
        actor_id=actor.user_id,
        actor_role=actor.role,
        scheduled_at=scheduled_at,
    )
    return {
        "status": d.status.value,
        "deliverable_id": str(d.id),
        "scheduled_at": scheduled_at.isoformat(),
    }


# ── Version History ────────────────────────────────────────────────────────────


@router.get("/{deliverable_id}/versions")
async def get_versions(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    """Return the full root_id revision chain, newest version first."""
    # First get the deliverable to find root_id
    wide_scope = TenantScope(client_id=actor.client_id, user_id=actor.user_id, role=actor.role)
    d = await _get_deliverable_or_404(deliverable_id, wide_scope, db)

    stmt = (
        select(Deliverable)
        .where(Deliverable.root_id == d.root_id)
        .order_by(Deliverable.version.desc())
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()

    return [
        {
            "id": str(v.id),
            "version": v.version,
            "status": v.status.value,
            "revision_round": v.revision_round,
            "file_url": v.file_url,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "approved_at": v.approved_at.isoformat() if v.approved_at else None,
        }
        for v in versions
    ]


# ── Portal Deliverables (Client) ──────────────────────────────────────────────


@portal_router.get("/deliverables")
async def portal_list_deliverables(
    status: DeliverableStatus | None = Query(None),
    limit: int = Query(default=50, ge=1, le=200),
    cursor_id: uuid.UUID | None = Query(None),  # keyset pagination cursor
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Client portal: list deliverables with keyset pagination and status filter.

    Uses cursor-based pagination (cursor_id = last seen id) to avoid OFFSET performance issues.
    Guaranteed: <= 3 DB queries (1 for deliverables, 1 for total pending count, 1 optional).
    """
    scope = _scope_from_actor(actor)
    if actor.role == UserRole.CLIENT:
        if not scope.client_id:
            return {"items": [], "has_more": False, "waiting_on_you": 0, "subscription_active": False}

        sub_check = await check_client_subscription(db, scope.client_id)
        if not sub_check["is_active"]:
            return {
                "items": [],
                "has_more": False,
                "waiting_on_you": 0,
                "subscription_active": False,
                "is_expired": sub_check["is_expired"],
                "server_time_utc": sub_check["server_time_utc"],
            }

    # Build keyset query — single query, no count(*) for main list
    stmt = select(Deliverable)

    if actor.role == UserRole.CLIENT:
        stmt = stmt.where(Deliverable.client_id == scope.client_id)
    elif scope.client_id:
        stmt = stmt.where(Deliverable.client_id == scope.client_id)

    if status:
        stmt = stmt.where(Deliverable.status == status)

    if cursor_id:
        # Keyset: get deliverables created before the cursor row (newest first pagination)
        cursor_stmt = select(Deliverable.created_at).where(Deliverable.id == cursor_id)
        cursor_res = await db.execute(cursor_stmt)
        cursor_created_at = cursor_res.scalar_one_or_none()
        if cursor_created_at:
            stmt = stmt.where(Deliverable.created_at < cursor_created_at)

    stmt = stmt.order_by(Deliverable.created_at.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    # Count items waiting for client decision (pending_approval for this client)
    waiting_stmt = select(func.count(Deliverable.id)).where(
        Deliverable.status == DeliverableStatus.PENDING_APPROVAL,
    )
    if scope.client_id:
        waiting_stmt = waiting_stmt.where(Deliverable.client_id == scope.client_id)
    waiting_count = (await db.execute(waiting_stmt)).scalar_one()

    return {
        "items": [
            {
                "id": str(d.id),
                "root_id": str(d.root_id),
                "version": d.version,
                "status": d.status.value,
                "file_url": d.file_url,
                "file_type": d.file_type,
                "revision_round": d.revision_round,
                "rejection_comment": d.rejection_comment,
                "approved_at": d.approved_at.isoformat() if d.approved_at else None,
                "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in items
        ],
        "has_more": has_more,
        "waiting_on_you": waiting_count,
        "limit": limit,
    }


async def submit_revision(
    db: AsyncSession,
    original: Deliverable,
    storage_key: str,
    file_size_bytes: int,
    submitted_by: uuid.UUID,
) -> Deliverable:
    """Create a new Deliverable row (version+1) sharing root_id. Archive the previous.

    Never mutates the original file — immutable version chain.
    """
    new_version = (original.version or 1) + 1
    new_deliverable = Deliverable(
        id=uuid.uuid4(),
        root_id=original.root_id,
        version=new_version,
        client_id=original.client_id,
        task_id=original.task_id,
        submitted_by=submitted_by,
        parent_deliverable_id=original.id,
        file_url=storage_key,
        file_type=original.file_type,
        file_size_bytes=file_size_bytes,
        status=DeliverableStatus.IN_PRODUCTION,
        revision_round=original.revision_round,
    )
    db.add(new_deliverable)

    # Archive previous version exclusively through state machine
    await deliverable_state.transition(
        db,
        original,
        DeliverableStatus.ARCHIVED,
        actor_id=submitted_by,
        actor_role=UserRole.EDITOR,
        reason=f"Superseded by revision v{new_version}",
    )
    await db.commit()
    await db.refresh(new_deliverable)
    return new_deliverable
