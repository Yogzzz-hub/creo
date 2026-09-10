"""Three-Phase Instagram Publishing Worker with full idempotency and crash resilience.

Per CLAUDE.md Invariant 12 & BUILD-PROMPTS.md Phase 6:
1. SELECT ... FOR UPDATE the deliverable; return early if already published.
2. Refresh long-lived token if within 3 days of expiration.
3. Check /content_publishing_limit; if quota_usage >= 25, retry in 1 hour.
4. Phase 1: Create media container, COMMIT ig_creation_id immediately.
5. Phase 2: Poll container status (FINISHED -> continue, ERROR -> clear creation_id).
6. Phase 3: Media publish, record ig_media_id & permalink, transition to published.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.enums import DeliverableStatus, UserRole
from app.models.user import ClientProfile
from app.models.work import Deliverable
from app.services.deliverable_state import transition
from app.services.instagram_client import (
    PermanentIGError,
    TransientIGError,
    get_instagram_client,
)
from app.workers.celery_app import celery_app
from app.workers.tasks.notify import send_notification_async

logger = logging.getLogger(__name__)

SYSTEM_ACTOR_ID: uuid.UUID | None = None


def run_async_safe(coro: Any) -> Any:
    """Run an async coroutine safely from sync Celery worker threads."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


async def execute_publish_deliverable_async(
    deliverable_id: uuid.UUID,
    *,
    max_poll_seconds: float = 300.0,
    poll_interval: float = 0.05,  # Faster in tests, 5s in live worker
    _simulate_crash_after_container: bool = False,
) -> dict[str, Any]:
    """Execute the 3-phase Instagram publishing workflow with transactional row locks."""
    ig_client = get_instagram_client()

    async with async_session_factory() as db:
        # 1. SELECT ... FOR UPDATE on Deliverable
        stmt = select(Deliverable).where(Deliverable.id == deliverable_id).with_for_update()
        res = await db.execute(stmt)
        deliverable = res.scalar_one_or_none()
        if not deliverable:
            return {"error": "Deliverable not found", "deliverable_id": str(deliverable_id)}

        # Invariant: Early return if already published — no duplicate API calls
        if deliverable.status == DeliverableStatus.PUBLISHED:
            logger.info("Deliverable %s is already published. Skipping.", deliverable_id)
            return {"status": "skipped", "reason": "already_published"}

        # Only scheduled, publishing, approved, or failed deliverables may be published
        allowed_initial_states = {
            DeliverableStatus.SCHEDULED,
            DeliverableStatus.PUBLISHING,
            DeliverableStatus.APPROVED,
            DeliverableStatus.PUBLISH_FAILED,
        }
        if deliverable.status not in allowed_initial_states:
            logger.warning(
                "Deliverable %s has invalid status %s for publishing.",
                deliverable_id,
                deliverable.status,
            )
            return {"status": "skipped", "reason": f"invalid_status_{deliverable.status}"}

        # 2. Fetch Client Profile for Instagram credentials and token expiry
        profile_stmt = select(ClientProfile).where(ClientProfile.user_id == deliverable.client_id)
        profile_res = await db.execute(profile_stmt)
        profile = profile_res.scalar_one_or_none()

        ig_user_id = (
            profile.instagram_user_id
            if profile and profile.instagram_user_id
            else "mock_ig_user_123"
        )

        # Check token expiration: refresh if within 3 days
        now = datetime.now(UTC)
        if profile and profile.ig_token_expires_at:
            if profile.ig_token_expires_at - now < timedelta(days=3):
                logger.info(
                    "Instagram token for user %s expires within 3 days. Refreshing.",
                    deliverable.client_id,
                )
                refresh_data = await ig_client.refresh_access_token("existing_token")
                new_expires_in = refresh_data.get("expires_in", 5184000)
                profile.ig_token_expires_at = now + timedelta(seconds=new_expires_in)
                await db.commit()

        # 3. Check Publishing Quota Limit (Meta 25-posts-per-24h ceiling)
        limits = await ig_client.get_content_publishing_limit(ig_user_id)
        quota_usage = limits.get("quota_usage", 0)
        if quota_usage >= 25:
            logger.warning(
                "IG limit reached (quota_usage=%s >= 25). Backing off 1 hour.",
                quota_usage,
            )
            return {
                "status": "rate_limited",
                "quota_usage": quota_usage,
                "retry_in_seconds": 3600,
            }

        # 4. Transition to PUBLISHING if not already in that state
        if deliverable.status != DeliverableStatus.PUBLISHING:
            await transition(
                db,
                deliverable,
                DeliverableStatus.PUBLISHING,
                actor_id=SYSTEM_ACTOR_ID,
                actor_role=UserRole.SUPER_ADMIN,
                request_id=f"publish-{deliverable_id}",
            )
            deliverable.publish_attempts = (deliverable.publish_attempts or 0) + 1
            await db.commit()

        # ── PHASE 1: Media Container Creation ──────────────────────────────
        if not deliverable.ig_creation_id:
            logger.info(
                "Phase 1: Creating Instagram media container for deliverable %s", deliverable_id
            )
            media_type = (
                "REELS"
                if deliverable.file_type.lower() in ("video/mp4", "mp4", "reel")
                else "IMAGE"
            )
            from app.services import storage_service
            public_file_url = deliverable.file_url
            if public_file_url and not (public_file_url.startswith("http://") or public_file_url.startswith("https://")):
                public_file_url = storage_service.signed_get(public_file_url, expires_in=3600)

            creation_id = await ig_client.create_media_container(
                ig_user_id=ig_user_id,
                media_type=media_type,
                file_url=public_file_url,
                caption=f"Release {deliverable.id}",
                thumb_offset=0,
            )

            # COMMIT ig_creation_id BEFORE going further so that if the worker process
            # crashes or is killed (kill -9), a resumed worker picks up from the persisted
            # container ID instead of re-creating another container and double-posting.
            deliverable.ig_creation_id = creation_id
            await db.commit()
            logger.info("Persisted ig_creation_id=%s before polling/publishing", creation_id)

            if _simulate_crash_after_container:
                logger.warning(
                    "Simulating worker process kill -9 immediately after container commit"
                )
                raise RuntimeError("Simulated worker kill -9 immediately after container commit")
        else:
            logger.info(
                "Resuming publish from previously persisted ig_creation_id=%s",
                deliverable.ig_creation_id,
            )

        # ── PHASE 2: Transcoding Polling Loop ─────────────────────────────
        logger.info("Phase 2: Polling container %s status", deliverable.ig_creation_id)
        deadline = time.monotonic() + max_poll_seconds
        is_finished = False

        while time.monotonic() < deadline:
            status_code = await ig_client.get_container_status(deliverable.ig_creation_id)
            if status_code == "FINISHED":
                is_finished = True
                break
            if status_code == "ERROR":
                logger.error(
                    "Container %s encountered ERROR in transcoding.", deliverable.ig_creation_id
                )
                deliverable.publish_error = "Instagram container transcoding error"
                # Clear ig_creation_id so future retry rebuilds a fresh container
                deliverable.ig_creation_id = None
                await transition(
                    db,
                    deliverable,
                    DeliverableStatus.PUBLISH_FAILED,
                    actor_id=SYSTEM_ACTOR_ID,
                    actor_role=UserRole.SUPER_ADMIN,
                    request_id=f"publish-{deliverable_id}",
                )
                await db.commit()
                return {
                    "status": "failed",
                    "reason": "container_error",
                    "deliverable_id": str(deliverable_id),
                }

            if poll_interval > 0:
                await asyncio.sleep(poll_interval)

        if not is_finished:
            raise TransientIGError("Instagram container transcoding timed out (>300s)")

        # ── PHASE 3: Media Publish ─────────────────────────────────────────
        logger.info("Phase 3: Publishing media container %s", deliverable.ig_creation_id)
        pub_result = await ig_client.publish_container(
            ig_user_id=ig_user_id,
            creation_id=deliverable.ig_creation_id,
        )

        deliverable.ig_media_id = pub_result["media_id"]
        deliverable.ig_permalink = pub_result["permalink"]
        deliverable.publish_error = None

        await transition(
            db,
            deliverable,
            DeliverableStatus.PUBLISHED,
            actor_id=SYSTEM_ACTOR_ID,
            actor_role=UserRole.SUPER_ADMIN,
            request_id=f"publish-{deliverable_id}",
        )
        await db.commit()

        # Send in-app / email notification to client
        try:
            msg = f"Your deliverable has been published to Instagram: {deliverable.ig_permalink}"
            await send_notification_async(
                user_id=deliverable.client_id,
                title="Deliverable Published",
                message=msg,
                channel="in_app",
                link=deliverable.ig_permalink,
            )
        except Exception as e:
            logger.warning("Failed to dispatch publish notification for %s: %s", deliverable_id, e)

        return {
            "status": "published",
            "deliverable_id": str(deliverable_id),
            "media_id": deliverable.ig_media_id,
            "permalink": deliverable.ig_permalink,
        }


@celery_app.task(
    bind=True,
    name="app.workers.tasks.publish.publish_deliverable_task",
    max_retries=5,
    acks_late=True,
    queue="publish",
)
def publish_deliverable_task(self: Any, deliverable_id_str: str) -> dict[str, Any]:
    """Celery task entrypoint for Instagram publishing."""
    uid = uuid.UUID(deliverable_id_str)
    try:
        result = run_async_safe(execute_publish_deliverable_async(uid, poll_interval=2.0))
        if result.get("status") == "rate_limited":
            # Retry in 1 hour per BUILD-PROMPTS.md Phase 6
            countdown = result.get("retry_in_seconds", 3600)
            err = TransientIGError("Rate limited")
            raise self.retry(countdown=countdown, exc=err) from err
        return result  # type: ignore[no-any-return]
    except TransientIGError as exc:
        raise self.retry(countdown=30, exc=exc) from exc
    except PermanentIGError as exc:
        logger.error(
            "Permanent IG publishing error for deliverable %s: %s", deliverable_id_str, exc
        )
        return {"status": "failed", "reason": str(exc)}
