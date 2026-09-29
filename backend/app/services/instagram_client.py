"""Instagram Graph API client service.

Provides a unified interface with:
1. FakeInstagramClient: Simulates video transcoding delays (returns IN_PROGRESS
   for 3 polls, then FINISHED) and configurable error injection for tests.
2. RealInstagramClient: Production client targeting the Meta Graph API v19.0.
Switched via settings.INSTAGRAM_CLIENT_MODE, eliminating scattered conditionals.
"""

from __future__ import annotations

import secrets
from typing import Any, Protocol

import httpx

from app.config import settings


class TransientIGError(Exception):
    """Temporary Instagram API or network error eligible for Celery backoff retry."""


class PermanentIGError(Exception):
    """Fatal Instagram Graph API error (invalid media, unrecoverable container error)."""


class InstagramClient(Protocol):
    async def create_media_container(
        self,
        ig_user_id: str,
        media_type: str,
        file_url: str,
        caption: str | None = None,
        thumb_offset: int | None = None,
        access_token: str | None = None,
    ) -> str: ...

    async def get_container_status(
        self,
        creation_id: str,
        access_token: str | None = None,
    ) -> str: ...

    async def publish_container(
        self,
        ig_user_id: str,
        creation_id: str,
        access_token: str | None = None,
    ) -> dict[str, str]: ...

    async def get_content_publishing_limit(
        self,
        ig_user_id: str,
        access_token: str | None = None,
    ) -> dict[str, int]: ...

    async def refresh_access_token(
        self,
        access_token: str,
    ) -> dict[str, Any]: ...


class FakeInstagramClient:
    """Mock client simulating Instagram Graph API container lifecycle.

    - Simulates transcoding delay: first 3 polls return IN_PROGRESS, then FINISHED.
    - Error hooks allow tests to force failures at container creation, polling, or publishing.
    """

    def __init__(self) -> None:
        self._poll_counts: dict[str, int] = {}
        self.simulate_fail_phase: str | None = None  # "container", "poll", "publish"
        self.mock_quota_usage: int = 0
        self.created_containers: list[str] = []
        self.published_posts: list[dict[str, str]] = []

    def reset(self) -> None:
        self._poll_counts.clear()
        self.simulate_fail_phase = None
        self.mock_quota_usage = 0
        self.created_containers.clear()
        self.published_posts.clear()

    async def create_media_container(
        self,
        ig_user_id: str,
        media_type: str,
        file_url: str,
        caption: str | None = None,
        thumb_offset: int | None = None,
        access_token: str | None = None,
    ) -> str:
        if self.simulate_fail_phase == "container":
            raise PermanentIGError("Simulated container creation error from Instagram Graph API")

        creation_id = f"ig_container_{secrets.token_hex(8)}"
        self._poll_counts[creation_id] = 0
        self.created_containers.append(creation_id)
        return creation_id

    async def get_container_status(
        self,
        creation_id: str,
        access_token: str | None = None,
    ) -> str:
        if self.simulate_fail_phase == "poll":
            return "ERROR"

        current_polls = self._poll_counts.get(creation_id, 0)
        self._poll_counts[creation_id] = current_polls + 1

        # Return IN_PROGRESS for 3 polls, then FINISHED (per BUILD-PROMPTS.md Phase 6)
        if current_polls < 3:
            return "IN_PROGRESS"
        return "FINISHED"

    async def publish_container(
        self,
        ig_user_id: str,
        creation_id: str,
        access_token: str | None = None,
    ) -> dict[str, str]:
        if self.simulate_fail_phase == "publish":
            raise TransientIGError("Simulated publish timeout from Instagram Graph API")

        media_id = f"ig_media_{secrets.token_hex(8)}"
        slug = secrets.token_urlsafe(9)
        permalink = f"https://www.instagram.com/reel/{slug}/"
        result = {"media_id": media_id, "permalink": permalink}
        self.published_posts.append(result)
        return result

    async def get_content_publishing_limit(
        self,
        ig_user_id: str,
        access_token: str | None = None,
    ) -> dict[str, int]:
        return {"quota_usage": self.mock_quota_usage}

    async def refresh_access_token(
        self,
        access_token: str,
    ) -> dict[str, Any]:
        return {
            "access_token": f"refreshed_{secrets.token_hex(16)}",
            "expires_in": 5184000,  # 60 days in seconds
        }


class RealInstagramClient:
    """Production Meta Graph API client targeting graph.facebook.com/v19.0."""

    BASE_URL = "https://graph.facebook.com/v19.0"

    async def create_media_container(
        self,
        ig_user_id: str,
        media_type: str,
        file_url: str,
        caption: str | None = None,
        thumb_offset: int | None = None,
        access_token: str | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "access_token": access_token,
        }
        if caption:
            payload["caption"] = caption

        mt = media_type.upper()
        if mt == "REELS" or mt == "REEL":
            payload["media_type"] = "REELS"
            payload["video_url"] = file_url
            if thumb_offset is not None:
                payload["thumb_offset"] = thumb_offset
        elif mt == "STORIES" or mt == "STORY":
            payload["media_type"] = "STORIES"
            if file_url.endswith((".mp4", ".mov")):
                payload["video_url"] = file_url
            else:
                payload["image_url"] = file_url
        else:
            payload["image_url"] = file_url

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.BASE_URL}/{ig_user_id}/media", data=payload)
            if resp.status_code >= 400:
                raise PermanentIGError(f"Container creation failed: {resp.text}")
            data = resp.json()
            return str(data["id"])

    async def get_container_status(
        self,
        creation_id: str,
        access_token: str | None = None,
    ) -> str:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/{creation_id}",
                params={"fields": "status_code,status", "access_token": access_token},
            )
            if resp.status_code >= 400:
                raise TransientIGError(f"Status check failed: {resp.text}")
            data = resp.json()
            return str(data.get("status_code", "IN_PROGRESS"))

    async def publish_container(
        self,
        ig_user_id: str,
        creation_id: str,
        access_token: str | None = None,
    ) -> dict[str, str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/{ig_user_id}/media_publish",
                data={"creation_id": creation_id, "access_token": access_token},
            )
            if resp.status_code >= 400:
                raise TransientIGError(f"Media publish failed: {resp.text}")
            data = resp.json()
            media_id = str(data["id"])

            # Retrieve permalink
            info_resp = await client.get(
                f"{self.BASE_URL}/{media_id}",
                params={"fields": "permalink", "access_token": access_token},
            )
            permalink = ""
            if info_resp.status_code == 200:
                permalink = info_resp.json().get("permalink", "")
            return {"media_id": media_id, "permalink": permalink}

    async def get_content_publishing_limit(
        self,
        ig_user_id: str,
        access_token: str | None = None,
    ) -> dict[str, int]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/{ig_user_id}/content_publishing_limit",
                params={"fields": "quota_usage,config", "access_token": access_token},
            )
            if resp.status_code >= 400:
                return {"quota_usage": 0}
            data = resp.json()
            quota_usage = 0
            for item in data.get("data", []):
                quota_usage = item.get("quota_usage", 0)
            return {"quota_usage": quota_usage}

    async def refresh_access_token(
        self,
        access_token: str,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/refresh_access_token",
                params={
                    "grant_type": "ig_refresh_token",
                    "access_token": access_token,
                },
            )
            if resp.status_code >= 400:
                raise TransientIGError(f"Token refresh failed: {resp.text}")
            return resp.json()  # type: ignore[no-any-return]


# Global fake client instance accessible in tests
fake_instagram_client = FakeInstagramClient()
real_instagram_client = RealInstagramClient()


def get_instagram_client() -> InstagramClient:
    """Return configured Instagram client based on INSTAGRAM_CLIENT_MODE."""
    if settings.INSTAGRAM_CLIENT_MODE.lower() == "real":
        return real_instagram_client
    return fake_instagram_client
