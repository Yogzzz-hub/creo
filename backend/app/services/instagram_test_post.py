"""Temporary immediate publishing of one fixed sample; no production approval bypass."""
import asyncio
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

from app.config import settings
from app.core.errors import Conflict, Forbidden, NotFound
from app.db.session import async_session_factory, tenant_session
from app.models.enums import AccountStatus, UserRole
from app.models.publishing import InstagramTestPost
from app.models.user import User
from app.services import deliverable_workflow as workflow
from app.services import instagram_connection as connection
from app.services import publishing_service as publishing
from app.services import storage_service
from app.services.instagram_client import InstagramError
from app.services.instagram_login import client_for_provider
from app.services.instagram_media import inspect_media

CAPTION = "Creo test post — checking the Instagram publishing connection."
SAMPLE = Path(__file__).resolve().parents[1] / "static" / "instagram-test-post.jpg"


async def authorize(db, actor, client_id):
    if actor.role not in (UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise Forbidden("Only a team lead or administrator can run this test.")
    caller = await db.get(User, actor.user_id)
    client = await db.get(User, client_id)
    if (not caller or caller.account_status != AccountStatus.ACTIVE
        or caller.must_reset_password or caller.role != actor.role
        or (actor.token_version is not None and actor.token_version != caller.token_version)):
        raise Forbidden("Your session changed. Sign in again.")
    if not client or client.role != UserRole.CLIENT or client.account_status != AccountStatus.ACTIVE:
        raise NotFound("Active client not found.")
    if not client.agency_id or (actor.role != UserRole.SUPER_ADMIN and
        (actor.agency_id != client.agency_id or caller.agency_id != client.agency_id)):
        raise Forbidden("Client belongs to another agency.")
    if actor.role == UserRole.TEAM_LEAD and not await workflow.on_client_pod(db, actor.user_id, client_id):
        raise Forbidden("This client is outside your pod.")
    return client


def serialize(row):
    return {key: str(getattr(row, key)) if key == "id" else getattr(row, key)
            for key in ("id", "status", "account_id", "permalink", "error", "scheduled_at")}


def check_connection(profile, account_id, connection_id=None):
    if (profile.ig_connection_status != "connected" or not profile.ig_token_encrypted
        or profile.instagram_user_id != account_id
        or not profile.ig_connection_id
        or (connection_id and profile.ig_connection_id != connection_id)
        or (profile.ig_token_expires_at and profile.ig_token_expires_at <= datetime.now(UTC))):
        raise Conflict("The Instagram connection changed or expired. Reconnect and select it again.")


async def create(db, actor, client_id, request_id, account_id, scheduled_at=None):
    if scheduled_at is not None and (scheduled_at.tzinfo is None or scheduled_at <= datetime.now(UTC)):
        raise Conflict("Choose a future time with a timezone for the queued test.")
    if not settings.INSTAGRAM_TEST_POSTING_ENABLED or settings.INSTAGRAM_CLIENT_MODE != "real":
        raise Conflict("Temporary test posting is disabled.")
    client = await authorize(db, actor, client_id)
    profile = await publishing.lock_profile(db, client_id)
    check_connection(profile, account_id)
    connection.require_configuration((profile.ig_metadata or {}).get("provider", "facebook"))
    row = await db.get(InstagramTestPost, request_id)
    if row:
        if row.client_id != client_id or row.actor_id != actor.user_id:
            raise Forbidden("Test request belongs to another account.")
        return row, False
    # A different retry key must not duplicate an unresolved provider submission.
    row = (await db.execute(select(InstagramTestPost).where(
        InstagramTestPost.client_id == client_id,
        InstagramTestPost.status.in_(("queued", "processing", "submitting", "uncertain")),
    ).order_by(InstagramTestPost.created_at.desc()).limit(1))).scalar_one_or_none()
    if row:
        return row, False
    row = InstagramTestPost(id=request_id, agency_id=client.agency_id, client_id=client_id,
        actor_id=actor.user_id, connection_id=profile.ig_connection_id,
        account_id=account_id, status="queued", scheduled_at=scheduled_at,
        actor_context={"role": str(actor.role), "token_version": actor.token_version})
    db.add(row)
    await db.commit()
    return row, True


async def run(request_id: uuid.UUID, agency_id: uuid.UUID, actor):
    async with async_session_factory() as db:
        async with tenant_session(db, agency_id=agency_id):
            row = (await db.execute(select(InstagramTestPost).where(
                InstagramTestPost.id == request_id).with_for_update())).scalar_one_or_none()
            if not row or row.status != "queued" or (row.scheduled_at and row.scheduled_at > datetime.now(UTC)):
                return
            row.status = "processing"
            await db.commit()
            try:
                if not settings.INSTAGRAM_TEST_POSTING_ENABLED:
                    raise Conflict("Temporary test posting is disabled.")
                await authorize(db, actor, row.client_id)
                profile = await publishing.lock_profile(db, row.client_id)
                check_connection(profile, row.account_id, row.connection_id)
                credentials = connection.unseal(profile.ig_token_encrypted)
                provider_name = credentials.get("provider", "facebook")
                provider = client_for_provider(provider_name)
                token = credentials["user_token" if provider_name == "instagram" else "page_token"]
                await provider.verify_account(row.account_id, (profile.ig_metadata or {}).get("page_id", ""), credentials)
                key = storage_service.make_storage_key(row.client_id, "image/jpeg")
                with SAMPLE.open("rb") as sample:
                    stored = await asyncio.to_thread(storage_service.put_object,
                        key, sample, "image/jpeg", SAMPLE.stat().st_size)
                url, _ = await inspect_media(stored, "IMAGE")
                row.container_id = await provider.create_media_container(
                    row.account_id, "IMAGE", url, CAPTION, access_token=token)
                await db.commit()

                for _ in range(15):
                    status = await provider.get_container_status(row.container_id, token)
                    if status == "FINISHED":
                        break
                    if status != "IN_PROGRESS":
                        raise Conflict("Instagram could not prepare the sample image.")
                    await asyncio.sleep(2)
                else:
                    raise Conflict("Instagram did not finish preparing the sample. Nothing was published.")
                await authorize(db, actor, row.client_id)
                profile = await publishing.lock_profile(db, row.client_id)
                check_connection(profile, row.account_id, row.connection_id)
                credentials = connection.unseal(profile.ig_token_encrypted)
                token = credentials["user_token" if provider_name == "instagram" else "page_token"]
                row.status = "submitting"
                await db.commit()  # Never automatically repeat a possibly accepted publish call.
                profile = await publishing.lock_profile(db, row.client_id)
                check_connection(profile, row.account_id, row.connection_id)
                result = await provider.publish_container(row.account_id, row.container_id, token)
                row.media_id, row.status = result["media_id"], "published"
                await db.commit()
                try:
                    row.permalink = await provider.media_permalink(row.media_id, token)
                    await db.commit()
                except InstagramError:
                    pass  # A missing permalink must never turn successful publication into failure.
            except Exception as exc:
                was_submitting = row.status == "submitting"
                await db.rollback()
                row = await db.get(InstagramTestPost, request_id)
                row.status = "uncertain" if was_submitting and (not isinstance(exc, InstagramError) or exc.ambiguous) else "failed"
                row.error = ("Instagram may have accepted the test. Check the account before retrying."
                             if row.status == "uncertain" else
                             str(exc) if isinstance(exc, (InstagramError, Conflict, Forbidden)) else
                             "The test could not complete. Check storage and Instagram setup.")
                await db.commit()


async def dispatch_scheduled_tests():
    from app.core.rbac import Actor
    from app.workers.tasks.maintenance import _get_active_agencies
    for agency_id in await _get_active_agencies():
        async with async_session_factory() as db:
            async with tenant_session(db, agency_id=agency_id):
                rows = (await db.execute(select(InstagramTestPost).where(
                    InstagramTestPost.status == "queued", InstagramTestPost.scheduled_at <= datetime.now(UTC)
                ).limit(20))).scalars().all()
                pending = [(row.id, row.actor_id, dict(row.actor_context)) for row in rows]
        for request_id, user_id, context in pending:
            actor = Actor(user_id=user_id, role=UserRole(context["role"]), agency_id=agency_id,
                          token_version=context.get("token_version"))
            await run(request_id, agency_id, actor)


async def scheduled_test_loop():
    from app.core.logging import get_logger
    while True:
        try:
            if settings.INSTAGRAM_TEST_POSTING_ENABLED:
                await dispatch_scheduled_tests()
        except Exception:
            get_logger(__name__).warning("scheduled_instagram_test_dispatch_failed")
        await asyncio.sleep(15)
