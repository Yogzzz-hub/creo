"""Deliverable production workflow: creative upload → lead QA → client review.

Implements App Flow Journeys 1 (steps 13-15), 2 and 5:

* A creative starts a task, uploads the finished file and the deliverable enters
  internal QA (``pending_qa``). The client never sees internal drafts.
* The pod lead approves (client is notified in-portal and by email and the file
  becomes visible) or sends it back with notes (the creative is notified).
* The client approves (download unlocked) or requests changes with a required
  comment (revision clock starts, creative and lead notified). The next upload
  becomes a new version of the same deliverable; the client keeps seeing
  "Revision in progress" until that version passes QA.

All status writes go through ``deliverable_state.transition``.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import Conflict, Forbidden, NotFound
from app.core.rbac import Actor
from app.models.billing import Plan, Subscription
from app.models.enums import (
    DeliverableStatus,
    DeliverableType,
    SubscriptionStatus,
    TaskStatus,
    UserRole,
)
from app.models.ops import AuditLog, Notification
from app.models.user import ClientProfile, StaffProfile, User
from app.models.work import ClientAssignment, Deliverable, Task
from app.services import deliverable_state, storage_service

log = structlog.get_logger(__name__)

# Statuses a client may see. Drafts, internal QA and QA rejections stay internal.
CLIENT_VISIBLE_STATUSES = frozenset({
    DeliverableStatus.PENDING_APPROVAL,
    DeliverableStatus.REVISION_REQUESTED,
    DeliverableStatus.APPROVED,
    DeliverableStatus.SCHEDULED,
    DeliverableStatus.PUBLISHING,
    DeliverableStatus.PUBLISHED,
    DeliverableStatus.PUBLISH_FAILED,
})
# Statuses whose file the client may download (App Flow 5.1 step 15).
DOWNLOADABLE_STATUSES = frozenset({
    DeliverableStatus.APPROVED,
    DeliverableStatus.SCHEDULED,
    DeliverableStatus.PUBLISHING,
    DeliverableStatus.PUBLISHED,
    DeliverableStatus.PUBLISH_FAILED,
})
# A newer upload archives these immediately: the client never saw them.
_SUPERSEDED_ON_UPLOAD = frozenset({DeliverableStatus.PENDING_QA, DeliverableStatus.QA_REJECTED})
# A task whose latest version is in one of these cannot take a new upload.
_LOCKED_FOR_UPLOAD = frozenset({DeliverableStatus.PENDING_APPROVAL}) | DOWNLOADABLE_STATUSES

REVISION_SLA_BUSINESS_HOURS = 24

TYPE_LABELS: dict[str, str] = {
    DeliverableType.REEL.value: "Reel",
    DeliverableType.STATIC_POST.value: "Poster",
    DeliverableType.CAROUSEL.value: "Carousel",
    DeliverableType.STORY.value: "Story",
    DeliverableType.SHOOT_DAY.value: "Shoot day",
}

_CREATIVE_ROLES = (UserRole.EDITOR, UserRole.DESIGNER)

_CLIENT_STATUS_LABELS: dict[str, str] = {
    DeliverableStatus.PENDING_APPROVAL.value: "Pending approval",
    DeliverableStatus.REVISION_REQUESTED.value: "Revision in progress",
    DeliverableStatus.APPROVED.value: "Approved",
    DeliverableStatus.SCHEDULED.value: "Scheduled",
    DeliverableStatus.PUBLISHING.value: "Publishing",
    DeliverableStatus.PUBLISHED.value: "Published",
    DeliverableStatus.PUBLISH_FAILED.value: "Approved",
}


# ── Small helpers ─────────────────────────────────────────────────────────────


def add_business_hours(start: datetime, hours: int) -> datetime:
    """Add working hours, skipping Saturdays and Sundays entirely."""
    remaining = timedelta(hours=hours)
    current = start
    while remaining > timedelta(0):
        if current.weekday() >= 5:
            days_to_monday = 7 - current.weekday()
            current = (current + timedelta(days=days_to_monday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            continue
        next_midnight = (current + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        step = min(remaining, next_midnight - current)
        current += step
        remaining -= step
    return current


def is_video(file_type: str | None, file_url: str | None = None) -> bool:
    kind = (file_type or "").lower()
    if kind.startswith("video/") or kind in ("mp4", "mov", "webm", "video"):
        return True
    return (file_url or "").lower().split("?")[0].endswith((".mp4", ".mov", ".webm"))


def deliverable_type_of(task: Task | None, deliverable: Deliverable) -> str:
    if task is not None and task.deliverable_type:
        return DeliverableType(task.deliverable_type).value
    return (
        DeliverableType.REEL.value
        if is_video(deliverable.file_type, deliverable.file_url)
        else DeliverableType.STATIC_POST.value
    )


def type_label(task: Task | None, deliverable: Deliverable) -> str:
    return TYPE_LABELS.get(deliverable_type_of(task, deliverable), "Deliverable")


def deliverable_title(task: Task | None, deliverable: Deliverable) -> str:
    blueprint = (task.blueprint if task is not None else None) or {}
    concept = blueprint.get("concept_name") or blueprint.get("title")
    if isinstance(concept, str) and concept.strip():
        return concept.strip()
    return type_label(task, deliverable)


def download_filename(task: Task | None, deliverable: Deliverable) -> str:
    stored = (deliverable.file_url or "").split("?")[0]
    ext = stored.rsplit(".", 1)[-1].lower() if "." in stored.rsplit("/", 1)[-1] else ""
    if not ext:
        ext = storage_service.ALLOWED_MIMES.get((deliverable.file_type or "").lower(), "bin")
    title = deliverable_title(task, deliverable).replace(" ", "_")
    return f"Creo_{title}_v{deliverable.version}.{ext}"


def _status(value: DeliverableStatus | str) -> DeliverableStatus:
    return DeliverableStatus(value)


# ── Access control ────────────────────────────────────────────────────────────


async def on_client_pod(db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID) -> bool:
    stmt = select(ClientAssignment.id).where(
        ClientAssignment.client_id == client_id,
        ClientAssignment.user_id == user_id,
    ).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def _reports_to(db: AsyncSession, user_id: uuid.UUID, lead_id: uuid.UUID) -> bool:
    stmt = select(StaffProfile.team_lead_id).where(StaffProfile.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none() == lead_id


async def ensure_task_access(db: AsyncSession, actor: Actor, task: Task) -> None:
    """Creatives work on their own tasks; leads on their pod; admins in their agency."""
    role = actor.role
    if role == UserRole.SUPER_ADMIN:
        return
    if role == UserRole.ADMIN:
        if actor.agency_id and task.agency_id and actor.agency_id != task.agency_id:
            raise Forbidden("This task belongs to another agency", code="TASK_FORBIDDEN")
        return
    if role in _CREATIVE_ROLES:
        if task.assigned_to == actor.user_id:
            return
        if task.assigned_to is None and await on_client_pod(db, actor.user_id, task.client_id):
            return
        raise Forbidden("This task is assigned to another creative", code="TASK_NOT_ASSIGNED")
    if role == UserRole.TEAM_LEAD:
        if task.assigned_to == actor.user_id:
            return
        if await on_client_pod(db, actor.user_id, task.client_id):
            return
        if task.assigned_to and await _reports_to(db, task.assigned_to, actor.user_id):
            return
        raise Forbidden("This task is outside your pod", code="TASK_FORBIDDEN")
    raise Forbidden("Only the creative team can work on production tasks", code="TASK_FORBIDDEN")


async def get_task_for_actor(db: AsyncSession, actor: Actor, task_id: uuid.UUID) -> Task:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFound(f"Task {task_id} not found", code="TASK_NOT_FOUND")
    await ensure_task_access(db, actor, task)
    return task


async def get_deliverable_for_review(
    db: AsyncSession, actor: Actor, deliverable_id: uuid.UUID
) -> tuple[Deliverable, Task | None]:
    deliverable = await db.get(Deliverable, deliverable_id)
    if deliverable is None:
        raise NotFound(f"Deliverable {deliverable_id} not found", code="DELIVERABLE_NOT_FOUND")
    task = await db.get(Task, deliverable.task_id) if deliverable.task_id else None
    if task is not None:
        await ensure_task_access(db, actor, task)
    elif actor.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and not await on_client_pod(
        db, actor.user_id, deliverable.client_id
    ):
        raise Forbidden("This deliverable is outside your pod", code="DELIVERABLE_FORBIDDEN")
    return deliverable, task


# ── Notifications ────────────────────────────────────────────────────────────


def _notify(db: AsyncSession, user_id: uuid.UUID | None, title: str, message: str, link: str,
            agency_id: uuid.UUID | None) -> None:
    if user_id is None:
        return
    db.add(Notification(
        agency_id=agency_id,
        user_id=user_id,
        title=title[:255],
        message=message,
        link=link,
        is_read=False,
        sent_at=datetime.now(UTC),
    ))


async def _pod_lead_ids(db: AsyncSession, client_id: uuid.UUID, creative_id: uuid.UUID | None) -> set[uuid.UUID]:
    leads: set[uuid.UUID] = set()
    stmt = select(ClientAssignment.user_id).where(
        ClientAssignment.client_id == client_id,
        ClientAssignment.role == "team_lead",
    )
    leads.update((await db.execute(stmt)).scalars().all())
    if creative_id is not None:
        lead = (await db.execute(
            select(StaffProfile.team_lead_id).where(StaffProfile.user_id == creative_id)
        )).scalar_one_or_none()
        if lead:
            leads.add(lead)
    return leads


async def _client_label(db: AsyncSession, client_id: uuid.UUID) -> str:
    company = (await db.execute(
        select(ClientProfile.company_name).where(ClientProfile.user_id == client_id)
    )).scalar_one_or_none()
    return company or "your client"


async def send_ready_for_review_email(to_email: str, label: str, link: str) -> None:
    """Best-effort email; the in-portal notification is the record of truth."""
    from app.services.email_service import send_email

    subject = f"Your {label.lower()} is ready for review"
    text = (
        f"Your creative team has finished your {label.lower()} and it passed internal QA.\n\n"
        f"Review it, approve it or request changes here: {link}\n"
    )
    html = (
        f"<p>Your creative team has finished your {label.lower()} and it passed internal QA.</p>"
        f'<p><a href="{link}">Review it in your Creo portal</a> to approve it or request changes.</p>'
    )
    try:
        sent = await send_email(to_email, subject, html, text)
        if not sent:
            log.warning("deliverable_review_email_not_sent", to_email=to_email)
    except Exception as exc:  # Email outages must never undo the review hand-off.
        log.warning("deliverable_review_email_failed", to_email=to_email, error=str(exc))


# ── Revision limits ──────────────────────────────────────────────────────────


async def plan_revision_rounds(db: AsyncSession, client_id: uuid.UUID) -> int:
    """Same source as the state machine's revision-limit check."""
    stmt = (
        select(Plan.revision_rounds)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(
            Subscription.client_id == client_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    rounds = (await db.execute(stmt)).scalar_one_or_none()
    return int(rounds) if rounds is not None else 1


# ── Team actions ─────────────────────────────────────────────────────────────


async def start_task(db: AsyncSession, actor: Actor, task: Task) -> Task:
    """Journey 5 step 4: the creative marks the task In Progress."""
    status = TaskStatus(task.status)
    if status == TaskStatus.IN_PRODUCTION:
        return task
    if status != TaskStatus.BACKLOG:
        raise Conflict(
            f"Task is already in '{status.value}' and cannot be started again",
            code="TASK_ALREADY_STARTED",
        )
    if task.assigned_to is None and actor.role in (*_CREATIVE_ROLES, UserRole.TEAM_LEAD):
        task.assigned_to = actor.user_id
    task.status = TaskStatus.IN_PRODUCTION
    db.add(AuditLog(
        agency_id=task.agency_id, actor_id=actor.user_id, actor_role=actor.role,
        entity="task", entity_id=task.id, action="task_started",
        from_value={"status": status.value}, to_value={"status": TaskStatus.IN_PRODUCTION.value},
    ))
    await db.commit()
    await db.refresh(task)
    return task


async def latest_version(db: AsyncSession, task_id: uuid.UUID) -> Deliverable | None:
    stmt = (
        select(Deliverable)
        .where(Deliverable.task_id == task_id, Deliverable.status != DeliverableStatus.ARCHIVED)
        .order_by(Deliverable.version.desc(), Deliverable.created_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalars().first()


async def submit_task_deliverable(
    db: AsyncSession,
    actor: Actor,
    task: Task,
    *,
    file_url: str,
    mime_type: str,
    file_size_bytes: int,
    notes: str | None = None,
) -> Deliverable:
    """Journey 5 steps 5-6: store the uploaded file as the next version, in internal QA."""
    if TaskStatus(task.status) in (TaskStatus.READY_TO_PUBLISH, TaskStatus.COMPLETED):
        raise Conflict("This task's deliverable is already approved", code="TASK_ALREADY_APPROVED")

    current = await latest_version(db, task.id)
    if current is not None and _status(current.status) in _LOCKED_FOR_UPLOAD:
        if _status(current.status) == DeliverableStatus.PENDING_APPROVAL:
            raise Conflict(
                "The client is reviewing the current version. Wait for approval or a change request.",
                code="AWAITING_CLIENT_DECISION",
            )
        raise Conflict("This deliverable is already approved", code="DELIVERABLE_ALREADY_APPROVED")

    new_id = uuid.uuid4()
    if current is not None:
        root_id = current.root_id
        max_version = (await db.execute(
            select(func.max(Deliverable.version)).where(Deliverable.root_id == root_id)
        )).scalar_one_or_none() or current.version
        version = int(max_version) + 1
        revision_round = current.revision_round or 0
    else:
        root_id, version, revision_round = new_id, 1, 0

    agency_id = task.agency_id
    if agency_id is None:
        agency_id = (await db.execute(
            select(User.agency_id).where(User.id == task.client_id)
        )).scalar_one_or_none()

    deliverable = Deliverable(
        id=new_id,
        root_id=root_id,
        version=version,
        agency_id=agency_id,
        client_id=task.client_id,
        task_id=task.id,
        submitted_by=actor.user_id,
        parent_deliverable_id=current.id if current is not None else None,
        file_url=file_url,
        file_type=mime_type,
        file_size_bytes=file_size_bytes,
        status=DeliverableStatus.PENDING_QA,
        revision_round=revision_round,
    )
    db.add(deliverable)
    await db.flush()

    if current is not None and _status(current.status) in _SUPERSEDED_ON_UPLOAD:
        await deliverable_state.transition(
            db, current, DeliverableStatus.ARCHIVED,
            actor_id=actor.user_id, actor_role=actor.role,
            reason=f"Superseded by v{version}", commit=False,
        )

    if task.assigned_to is None and actor.role in (*_CREATIVE_ROLES, UserRole.TEAM_LEAD):
        task.assigned_to = actor.user_id
    task.status = TaskStatus.INTERNAL_QA

    db.add(AuditLog(
        agency_id=agency_id, actor_id=actor.user_id, actor_role=actor.role,
        entity="deliverable", entity_id=deliverable.id, action="deliverable_submitted",
        to_value={"status": DeliverableStatus.PENDING_QA.value, "version": version,
                  "task_id": str(task.id), "notes": notes},
    ))

    label = TYPE_LABELS.get(DeliverableType(task.deliverable_type).value, "Deliverable")
    client_label = await _client_label(db, task.client_id)
    message = f"v{version} uploaded for {client_label}."
    if notes:
        message += f" Notes: {notes}"
    for lead_id in await _pod_lead_ids(db, task.client_id, actor.user_id):
        if lead_id != actor.user_id:
            _notify(db, lead_id, f"QA review needed: {label}", message, "/lead/deliverables", agency_id)

    await db.commit()
    await db.refresh(deliverable)
    log.info("deliverable_submitted", deliverable_id=str(deliverable.id), task_id=str(task.id),
             version=version)
    return deliverable


async def qa_decide(
    db: AsyncSession,
    actor: Actor,
    deliverable: Deliverable,
    task: Task | None,
    *,
    approve: bool,
    notes: str | None = None,
) -> tuple[Deliverable, dict[str, str] | None]:
    """Lead QA. Returns the deliverable and, on approval, the email to send to the client."""
    if _status(deliverable.status) != DeliverableStatus.PENDING_QA:
        raise Conflict(
            f"Deliverable is '{_status(deliverable.status).value}', not awaiting QA",
            code="NOT_AWAITING_QA",
        )
    label = type_label(task, deliverable)
    email: dict[str, str] | None = None

    if approve:
        await deliverable_state.transition(
            db, deliverable, DeliverableStatus.PENDING_APPROVAL,
            actor_id=actor.user_id, actor_role=actor.role, reason=notes, commit=False,
        )
        # Internal QA notes never reach the client.
        deliverable.rejection_comment = None
        # The client now reviews this version instead of the one they sent back.
        previous = (await db.execute(
            select(Deliverable).where(
                Deliverable.root_id == deliverable.root_id,
                Deliverable.id != deliverable.id,
                Deliverable.status == DeliverableStatus.REVISION_REQUESTED,
            )
        )).scalars().all()
        for old in previous:
            await deliverable_state.transition(
                db, old, DeliverableStatus.ARCHIVED,
                actor_id=actor.user_id, actor_role=actor.role,
                reason=f"Revised as v{deliverable.version}", commit=False,
            )
        link = f"/portal/deliverables/{deliverable.id}"
        verb = "revised " if deliverable.version > 1 else ""
        _notify(
            db, deliverable.client_id,
            f"Your {verb}{label.lower()} is ready for review",
            "Your creative team has finished it. Approve it or request changes.",
            link, deliverable.agency_id,
        )
        client_email = (await db.execute(
            select(User.email).where(User.id == deliverable.client_id)
        )).scalar_one_or_none()
        if client_email:
            email = {
                "to_email": client_email,
                "label": f"{verb}{label}".strip().capitalize(),
                "link": f"{settings.FRONTEND_URL.rstrip('/')}{link}",
            }
    else:
        if not (notes or "").strip():
            raise Conflict("QA notes are required to send work back", code="MISSING_QA_NOTES")
        await deliverable_state.transition(
            db, deliverable, DeliverableStatus.QA_REJECTED,
            actor_id=actor.user_id, actor_role=actor.role, qa_notes=notes.strip(), commit=False,
        )
        creative = (task.assigned_to if task is not None else None) or deliverable.submitted_by
        _notify(
            db, creative, f"QA changes requested: {label}", notes.strip(),
            "/workstation/tasks", deliverable.agency_id,
        )

    await db.commit()
    await db.refresh(deliverable)
    return deliverable, email


# ── Client actions ───────────────────────────────────────────────────────────


async def _team_recipients(db: AsyncSession, deliverable: Deliverable, task: Task | None) -> set[uuid.UUID]:
    creative = (task.assigned_to if task is not None else None) or deliverable.submitted_by
    recipients = await _pod_lead_ids(db, deliverable.client_id, creative)
    if creative:
        recipients.add(creative)
    return recipients


async def client_approve(
    db: AsyncSession, actor: Actor, deliverable: Deliverable, *, request_id: str | None = None
) -> Deliverable:
    """Journey 1 step 15: approval unlocks download and moves the task to ready-to-publish."""
    task = await db.get(Task, deliverable.task_id) if deliverable.task_id else None
    await deliverable_state.transition(
        db, deliverable, DeliverableStatus.APPROVED,
        actor_id=actor.user_id, actor_role=actor.role, request_id=request_id, commit=False,
    )
    label = type_label(task, deliverable)
    client_label = await _client_label(db, deliverable.client_id)
    for user_id in await _team_recipients(db, deliverable, task):
        _notify(db, user_id, f"Client approved: {label}",
                f"{client_label} approved v{deliverable.version}.",
                "/workstation/tasks", deliverable.agency_id)
    await db.commit()
    await db.refresh(deliverable)
    return deliverable


async def client_request_changes(
    db: AsyncSession, actor: Actor, deliverable: Deliverable, comment: str
) -> Deliverable:
    """Journey 2 steps 4-5: required comment, revision task, 24-business-hour clock."""
    comment = comment.strip()
    if not comment:
        raise Conflict("Please describe what should change", code="MISSING_REJECTION_COMMENT")
    task = await db.get(Task, deliverable.task_id) if deliverable.task_id else None
    await deliverable_state.transition(
        db, deliverable, DeliverableStatus.REVISION_REQUESTED,
        actor_id=actor.user_id, actor_role=actor.role, reason=comment, commit=False,
    )
    # transition() linked or created the task; start the revision clock on it.
    task = await db.get(Task, deliverable.task_id) if deliverable.task_id else task
    if task is not None:
        task.is_revision = True
        task.sla_due_at = add_business_hours(datetime.now(UTC), REVISION_SLA_BUSINESS_HOURS)
        task.last_sla_notified_at = None
    label = type_label(task, deliverable)
    client_label = await _client_label(db, deliverable.client_id)
    for user_id in await _team_recipients(db, deliverable, task):
        _notify(db, user_id, f"Revision requested: {label}",
                f"{client_label} on v{deliverable.version}: {comment}",
                "/workstation/tasks", deliverable.agency_id)
    await db.commit()
    await db.refresh(deliverable)
    return deliverable


# ── Client views ─────────────────────────────────────────────────────────────


async def client_seen_ids(db: AsyncSession, deliverable_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    """Archived versions the client actually reviewed (they reached pending_approval)."""
    if not deliverable_ids:
        return set()
    stmt = select(AuditLog.entity_id).where(
        AuditLog.entity == "deliverable",
        AuditLog.entity_id.in_(deliverable_ids),
        AuditLog.action == "status_change",
        AuditLog.to_value["status"].astext == DeliverableStatus.PENDING_APPROVAL.value,
    )
    return set((await db.execute(stmt)).scalars().all())


def serialize_for_client(
    deliverable: Deliverable,
    task: Task | None,
    *,
    request: Any | None = None,
    revisions_allowed: int | None = None,
) -> dict[str, Any]:
    status = _status(deliverable.status)
    downloadable = status in DOWNLOADABLE_STATUSES
    # Only the client's own change request is shown; internal QA notes are never sent.
    feedback = deliverable.rejection_comment if status in (
        DeliverableStatus.REVISION_REQUESTED, DeliverableStatus.ARCHIVED
    ) else None
    return {
        "id": str(deliverable.id),
        "root_id": str(deliverable.root_id),
        "version": deliverable.version,
        "status": status.value,
        "status_label": _CLIENT_STATUS_LABELS.get(status.value, "Superseded"),
        "title": deliverable_title(task, deliverable),
        "deliverable_type": deliverable_type_of(task, deliverable),
        "type_label": type_label(task, deliverable),
        "file_url": storage_service.resolve_media_url(deliverable.file_url, request),
        "file_type": deliverable.file_type,
        "is_video": is_video(deliverable.file_type, deliverable.file_url),
        "file_size_bytes": deliverable.file_size_bytes,
        "download_url": storage_service.resolve_media_url(
            deliverable.file_url, request, download_filename(task, deliverable)
        ) if downloadable else None,
        "revision_round": deliverable.revision_round or 0,
        "revisions_used": deliverable.revision_round or 0,
        "revisions_allowed": revisions_allowed,
        "rejection_comment": feedback,
        "approved_at": deliverable.approved_at.isoformat() if deliverable.approved_at else None,
        "scheduled_at": deliverable.scheduled_at.isoformat() if deliverable.scheduled_at else None,
        "due_date": task.due_date.isoformat() if task is not None and task.due_date else None,
        "created_at": deliverable.created_at.isoformat() if deliverable.created_at else None,
    }


def serialize_for_team(deliverable: Deliverable, request: Any | None = None) -> dict[str, Any]:
    """Compact deliverable shape for pod boards; includes internal QA notes."""
    return {
        "id": str(deliverable.id),
        "root_id": str(deliverable.root_id),
        "version": deliverable.version,
        "file_url": storage_service.resolve_media_url(deliverable.file_url, request),
        "file_type": deliverable.file_type,
        "is_video": is_video(deliverable.file_type, deliverable.file_url),
        "status": _status(deliverable.status).value,
        "revision_round": deliverable.revision_round or 0,
        "rejection_comment": deliverable.rejection_comment,
        "created_at": deliverable.created_at.isoformat() if deliverable.created_at else None,
    }
