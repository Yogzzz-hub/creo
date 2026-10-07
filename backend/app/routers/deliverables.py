"""Deliverables API router.

All status mutations route through deliverable_state.transition() exclusively,
via app.services.deliverable_workflow.

Team (editor / designer / team lead / admin):
    POST /deliverables/tasks/{task_id}/start          — backlog → in_production
    POST /deliverables/tasks/{task_id}/upload-intent  — pre-signed PUT for a direct browser upload
    POST /deliverables/tasks/{task_id}/submit         — confirm the direct upload → new version in QA
    POST /deliverables/tasks/{task_id}/upload         — server-side upload fallback → new version in QA
    POST /deliverables/{id}/qa-approve                — pending_qa → pending_approval (team_lead+)
    POST /deliverables/{id}/qa-reject                 — pending_qa → qa_rejected (team_lead+, notes required)
    POST /deliverables/{id}/schedule                  — approved → scheduled (staff)

Client:
    POST /deliverables/{id}/approve                   — pending_approval → approved (Idempotency-Key)
    POST /deliverables/{id}/request-changes           — pending_approval → revision_requested
    GET  /portal/deliverables                         — client-visible deliverables, latest version each
    GET  /portal/deliverables/download-zip            — approved files as one archive
    GET  /portal/deliverables/{id}                    — detail with client-visible version history
    GET  /deliverables/{id}/versions                  — version chain (clients see reviewed versions only)
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime
from typing import Any

import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    File,
    Form,
    Header,
    Query,
    Request,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, Conflict, Forbidden, NotFound
from app.core.rbac import Actor, get_current_actor
from app.db.session import get_db
from app.models.enums import DeliverableStatus, UserRole
from app.models.work import Deliverable, Task
from app.repositories.base import DeliverableRepository, TenantScope
from app.services import deliverable_state, storage_service
from app.services import deliverable_workflow as workflow
from app.services.subscription_guard import check_client_subscription, require_active_subscription

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/deliverables", tags=["Deliverables"])
portal_router = APIRouter(prefix="/portal", tags=["Portal"])

_EXTENSION_MIMES = {ext: mime for mime, ext in storage_service.ALLOWED_MIMES.items()}
_EXTENSION_MIMES["jpeg"] = "image/jpeg"


def _scope_from_actor(actor: Actor) -> TenantScope:
    return TenantScope(
        agency_id=actor.agency_id,
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


def _require_team(actor: Actor) -> None:
    if actor.role not in deliverable_state._STAFF_ROLES:
        raise Forbidden("Only the creative team can upload deliverables", code="UPLOAD_FORBIDDEN")


def _storage_conflict(exc: storage_service.StorageError) -> AppError:
    if isinstance(exc, (
        storage_service.UnsupportedMimeType,
        storage_service.FileTooLarge,
        storage_service.ObjectNotFound,
        storage_service.ContentLengthMismatch,
    )):
        return Conflict(exc.message, code=exc.code)
    return AppError(exc.message, code=exc.code, status_code=503)


def _guess_mime(upload: UploadFile) -> str:
    declared = (upload.content_type or "").lower()
    if declared in storage_service.ALLOWED_MIMES:
        return declared
    ext = (upload.filename or "").rsplit(".", 1)[-1].lower() if "." in (upload.filename or "") else ""
    return _EXTENSION_MIMES.get(ext, declared or "application/octet-stream")


def _team_deliverable_response(d: Deliverable, request: Request) -> dict[str, object]:
    return {**workflow.serialize_for_team(d, request), "task_id": str(d.task_id) if d.task_id else None}


# ── Team: production task actions ────────────────────────────────────────────


class UploadIntentRequest(BaseModel):
    mime_type: str
    file_size_bytes: int = Field(gt=0)


class SubmitUploadRequest(BaseModel):
    storage_key: str
    mime_type: str
    file_size_bytes: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=2000)


@router.post("/tasks/{task_id}/start")
async def start_task(
    task_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Creative marks a queued task In Progress (App Flow 5.5 step 4)."""
    _require_team(actor)
    task = await workflow.get_task_for_actor(db, actor, task_id)
    task = await workflow.start_task(db, actor, task)
    return {
        "task_id": str(task.id),
        "status": task.status.value,
        "assigned_to": str(task.assigned_to) if task.assigned_to else None,
    }


@router.post("/tasks/{task_id}/upload-intent")
async def task_upload_intent(
    task_id: uuid.UUID,
    payload: UploadIntentRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Pre-signed PUT URL so large files go straight from the browser to storage."""
    _require_team(actor)
    task = await workflow.get_task_for_actor(db, actor, task_id)
    try:
        storage_service.validate_media(payload.mime_type, payload.file_size_bytes)
    except storage_service.StorageError as exc:
        raise _storage_conflict(exc) from exc
    if not storage_service.supports_direct_upload():
        return {"direct_upload": False, "mime_type": payload.mime_type}
    try:
        intent = await asyncio.to_thread(
            storage_service.upload_intent, task.client_id, payload.mime_type, payload.file_size_bytes
        )
    except storage_service.StorageError as exc:
        raise _storage_conflict(exc) from exc
    return {**intent, "direct_upload": True, "task_id": str(task.id)}


@router.post("/tasks/{task_id}/submit")
async def submit_direct_upload(
    task_id: uuid.UUID,
    payload: SubmitUploadRequest,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Confirm a direct upload exists in storage, then send it to lead QA."""
    _require_team(actor)
    task = await workflow.get_task_for_actor(db, actor, task_id)
    # A key from another client's namespace must never be attachable to this task.
    if not payload.storage_key.startswith(f"clients/{task.client_id}/"):
        raise Forbidden("Storage key does not belong to this client", code="STORAGE_KEY_FORBIDDEN")
    try:
        storage_service.validate_media(payload.mime_type, payload.file_size_bytes)
        await asyncio.to_thread(
            storage_service.confirm_upload, payload.storage_key, payload.file_size_bytes
        )
    except storage_service.StorageError as exc:
        raise _storage_conflict(exc) from exc
    d = await workflow.submit_task_deliverable(
        db, actor, task,
        file_url=payload.storage_key,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        notes=payload.notes,
    )
    return _team_deliverable_response(d, request)


@router.post("/tasks/{task_id}/upload")
async def upload_task_file(
    task_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    notes: str | None = Form(default=None, max_length=2000),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Server-side upload used when a direct browser PUT is unavailable."""
    _require_team(actor)
    task = await workflow.get_task_for_actor(db, actor, task_id)
    mime_type = _guess_mime(file)
    size = file.size
    if size is None:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
    file.file.seek(0)
    try:
        storage_service.validate_media(mime_type, size)
        storage_key = storage_service.make_storage_key(task.client_id, mime_type)
        stored = await asyncio.to_thread(
            storage_service.put_object, storage_key, file.file, mime_type, size
        )
    except storage_service.StorageError as exc:
        raise _storage_conflict(exc) from exc
    d = await workflow.submit_task_deliverable(
        db, actor, task,
        file_url=stored,
        mime_type=mime_type,
        file_size_bytes=size,
        notes=notes,
    )
    return _team_deliverable_response(d, request)


# ── Lead QA ──────────────────────────────────────────────────────────────────


class QADecisionRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


async def _qa(
    deliverable_id: uuid.UUID,
    approve: bool,
    notes: str | None,
    actor: Actor,
    db: AsyncSession,
    background: BackgroundTasks,
) -> dict[str, str]:
    d, task = await workflow.get_deliverable_for_review(db, actor, deliverable_id)
    d, email = await workflow.qa_decide(db, actor, d, task, approve=approve, notes=notes)
    if email:
        background.add_task(workflow.send_ready_for_review_email, **email)
    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/qa-approve")
async def qa_approve(
    deliverable_id: uuid.UUID,
    background: BackgroundTasks,
    payload: QADecisionRequest | None = Body(default=None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Team lead approves QA; the client is notified in-portal and by email."""
    return await _qa(deliverable_id, True, payload.notes if payload else None, actor, db, background)


@router.post("/{deliverable_id}/qa-reject")
async def qa_reject(
    deliverable_id: uuid.UUID,
    background: BackgroundTasks,
    qa_notes: str | None = Query(default=None),
    payload: QADecisionRequest | None = Body(default=None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Team lead sends work back to the creative. Notes are required."""
    notes = (payload.notes if payload and payload.notes else qa_notes) or ""
    return await _qa(deliverable_id, False, notes, actor, db, background)


# ── Client decisions ─────────────────────────────────────────────────────────


class RequestChangesBody(BaseModel):
    rejection_comment: str = Field(min_length=1, max_length=4000)


@router.post("/{deliverable_id}/approve")
async def approve_deliverable(
    deliverable_id: uuid.UUID,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    _sub_guard: dict[str, Any] = Depends(require_active_subscription),
) -> dict[str, str]:
    """Client approves deliverable. pending_approval → approved. Idempotency-Key honoured."""
    scope = _scope_from_actor(actor)
    d = await _get_deliverable_or_404(deliverable_id, scope, db)

    if d.status == DeliverableStatus.APPROVED:
        log.info("approve_idempotent", deliverable_id=str(deliverable_id), idempotency_key=idempotency_key)
        return {"status": d.status.value, "deliverable_id": str(d.id), "idempotent": "true"}

    d = await workflow.client_approve(db, actor, d, request_id=idempotency_key)
    return {"status": d.status.value, "deliverable_id": str(d.id)}


@router.post("/{deliverable_id}/request-changes")
async def request_changes(
    deliverable_id: uuid.UUID,
    rejection_comment: str | None = Query(default=None),
    payload: RequestChangesBody | None = Body(default=None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
    _sub_guard: dict[str, Any] = Depends(require_active_subscription),
) -> dict[str, object]:
    """Client requests changes. pending_approval → revision_requested. Comment required.

    On REVISION_LIMIT_REACHED, raises Conflict with code 'REVISION_LIMIT_REACHED'.
    The frontend should render a plan upsell dialog, not a red toast.
    """
    comment = (payload.rejection_comment if payload else rejection_comment) or ""
    scope = _scope_from_actor(actor)
    d = await _get_deliverable_or_404(deliverable_id, scope, db)
    d = await workflow.client_request_changes(db, actor, d, comment)
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
    _require_team(actor)
    d, _task = await workflow.get_deliverable_for_review(db, actor, deliverable_id)
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


async def _client_history(
    db: AsyncSession, d: Deliverable, request: Request, revisions_allowed: int
) -> list[dict[str, object]]:
    """Versions of this deliverable the client has been shown, newest first."""
    rows = (await db.execute(
        select(Deliverable, Task)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(Deliverable.root_id == d.root_id)
        .order_by(Deliverable.version.desc())
    )).all()
    archived = [v.id for v, _t in rows if v.status == DeliverableStatus.ARCHIVED]
    seen = await workflow.client_seen_ids(db, archived)
    return [
        workflow.serialize_for_client(v, t, request=request, revisions_allowed=revisions_allowed)
        for v, t in rows
        if v.status in workflow.CLIENT_VISIBLE_STATUSES or v.id in seen
    ]


@router.get("/{deliverable_id}/versions")
async def get_versions(
    deliverable_id: uuid.UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    """Return the root_id revision chain, newest version first."""
    if actor.role == UserRole.CLIENT:
        d = await _get_deliverable_or_404(deliverable_id, _scope_from_actor(actor), db)
        allowed = await workflow.plan_revision_rounds(db, d.client_id)
        return await _client_history(db, d, request, allowed)

    _require_team(actor)
    d, _task = await workflow.get_deliverable_for_review(db, actor, deliverable_id)
    versions = (await db.execute(
        select(Deliverable).where(Deliverable.root_id == d.root_id).order_by(Deliverable.version.desc())
    )).scalars().all()
    return [workflow.serialize_for_team(v, request) for v in versions]


# ── Zip Download Endpoint ──────────────────────────────────────────────────────


@router.get("/download-zip")
@portal_router.get("/deliverables/download-zip")
async def download_all_approved_zip(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Bundle the client's approved deliverables into a downloadable ZIP archive."""
    import io
    import zipfile

    import httpx
    from fastapi.responses import StreamingResponse

    client_id = actor.client_id or actor.user_id
    rows = (await db.execute(
        select(Deliverable, Task)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(
            Deliverable.client_id == client_id,
            Deliverable.status.in_(list(workflow.DOWNLOADABLE_STATUSES)),
        )
        .order_by(Deliverable.created_at.desc())
    )).all()

    zip_buffer = io.BytesIO()
    included = 0
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for idx, (d, task) in enumerate(rows, 1):
                filename = f"{idx:02d}_{workflow.download_filename(task, d)}"
                raw = d.file_url or ""
                try:
                    if raw.startswith(storage_service.LOCAL_UPLOAD_PREFIXES):
                        # /static/<path> and the legacy /uploads/<path> mount both live under app/static.
                        relative = raw[len("/static/"):] if raw.startswith("/static/") else "uploads/" + raw[len("/uploads/"):]
                        local = os.path.join(storage_service._LOCAL_STATIC_DIR, relative)
                        if os.path.isfile(local):
                            zf.write(local, filename)
                            included += 1
                            continue
                    url = storage_service.resolve_media_url(raw)
                    if url:
                        resp = await http_client.get(url)
                        if resp.status_code == 200:
                            zf.writestr(filename, resp.content)
                            included += 1
                            continue
                except Exception as exc:
                    log.warning("zip_asset_fetch_failed", deliverable_id=str(d.id), error=str(exc))
                zf.writestr(f"{filename}.missing.txt", f"Deliverable {d.id} could not be fetched.\n")

        zf.writestr(
            "MANIFEST.txt",
            f"Creo approved assets\nFiles: {included} of {len(rows)}\nGenerated: {datetime.now().isoformat()}\n",
        )

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=creo_approved_assets.zip"},
    )


# ── Portal Deliverables (Client) ──────────────────────────────────────────────


async def _portal_gate(db: AsyncSession, client_id: uuid.UUID) -> dict[str, Any] | None:
    """Return an empty-list payload when the client may not see deliverables yet."""
    from fastapi import HTTPException

    from app.services.onboarding_service import get_onboarding_status

    ob_status = await get_onboarding_status(db, client_id)
    if not ob_status.is_complete:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "ONBOARDING_INCOMPLETE",
                "message": "Onboarding must be completed before accessing deliverables.",
                "stage": ob_status.stage,
                "next_required_stage": ob_status.next_required_stage,
                "next_route": ob_status.next_route,
                "resume_section": ob_status.resume_section,
            },
        )
    sub_check = await check_client_subscription(db, client_id)
    if not sub_check["is_active"]:
        return {
            "items": [],
            "has_more": False,
            "waiting_on_you": 0,
            "subscription_active": False,
            "is_expired": sub_check["is_expired"],
            "server_time_utc": sub_check["server_time_utc"],
        }
    return None


@portal_router.get("/deliverables")
async def portal_list_deliverables(
    request: Request,
    status: DeliverableStatus | None = Query(None),
    limit: int = Query(default=50, ge=1, le=200),
    cursor_id: uuid.UUID | None = Query(None),  # keyset pagination cursor
    client_id: uuid.UUID | None = Query(None, description="Staff only: whose portal to view"),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Client portal: deliverables the client may see, newest first, one card per deliverable.

    Internal drafts (in production, internal QA, QA rejections) are never listed.
    """
    if actor.role == UserRole.CLIENT:
        target = actor.client_id
        if not target:
            return {"items": [], "has_more": False, "waiting_on_you": 0, "subscription_active": False}
        blocked = await _portal_gate(db, target)
        if blocked is not None:
            return blocked
    elif actor.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        target = client_id or actor.client_id
        if target is None:
            return {"items": [], "has_more": False, "waiting_on_you": 0, "limit": limit}
    else:
        raise Forbidden("The client portal is for clients", code="PORTAL_FORBIDDEN")

    visible = list(workflow.CLIENT_VISIBLE_STATUSES)
    if status is not None and status not in workflow.CLIENT_VISIBLE_STATUSES:
        visible = []
    elif status is not None:
        visible = [status]

    stmt = (
        select(Deliverable, Task)
        .outerjoin(Task, Task.id == Deliverable.task_id)
        .where(Deliverable.client_id == target, Deliverable.status.in_(visible))
    )
    if cursor_id:
        cursor_created_at = (await db.execute(
            select(Deliverable.created_at).where(Deliverable.id == cursor_id)
        )).scalar_one_or_none()
        if cursor_created_at:
            stmt = stmt.where(Deliverable.created_at < cursor_created_at)

    stmt = stmt.order_by(Deliverable.created_at.desc()).limit(limit + 1)
    rows = list((await db.execute(stmt)).all())
    has_more = len(rows) > limit
    rows = rows[:limit]

    # One card per deliverable: keep only the newest visible version of each root.
    newest: dict[uuid.UUID, tuple[Deliverable, Task | None]] = {}
    for d, t in rows:
        kept = newest.get(d.root_id)
        if kept is None or d.version > kept[0].version:
            newest[d.root_id] = (d, t)
    ordered = sorted(newest.values(), key=lambda pair: pair[0].created_at or datetime.min, reverse=True)

    waiting_count = (await db.execute(
        select(func.count(Deliverable.id)).where(
            Deliverable.client_id == target,
            Deliverable.status == DeliverableStatus.PENDING_APPROVAL,
        )
    )).scalar_one()
    allowed = await workflow.plan_revision_rounds(db, target)

    # Storage signing can perform remote I/O; never block the API event loop.
    semaphore = asyncio.Semaphore(6)
    async def serialize(pair):
        async with semaphore:
            return await asyncio.to_thread(workflow.serialize_for_client, pair[0], pair[1],
                request=request, revisions_allowed=allowed)
    items = await asyncio.gather(*(serialize(pair) for pair in ordered))
    return {
        "items": items,
        "has_more": has_more,
        "waiting_on_you": waiting_count,
        "revisions_allowed": allowed,
        "limit": limit,
    }


@portal_router.get("/deliverables/{deliverable_id}")
async def portal_deliverable_detail(
    deliverable_id: uuid.UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Deliverable detail for /portal/deliverables/{id}, including its reviewed versions."""
    if actor.role not in (UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise Forbidden("The client portal is for clients", code="PORTAL_FORBIDDEN")
    d = await _get_deliverable_or_404(deliverable_id, _scope_from_actor(actor), db)
    if actor.role == UserRole.CLIENT:
        blocked = await _portal_gate(db, d.client_id)
        if blocked is not None:
            raise Conflict("An active subscription is required to view deliverables",
                           code="SUBSCRIPTION_INACTIVE")
    allowed = await workflow.plan_revision_rounds(db, d.client_id)
    versions = await _client_history(db, d, request, allowed)
    if not versions:
        raise NotFound(f"Deliverable {deliverable_id} not found", code="DELIVERABLE_NOT_FOUND")
    current = next((v for v in versions if v["id"] == str(d.id)), versions[0])
    return {**current, "versions": versions}
