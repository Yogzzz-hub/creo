"""Facebook Login / Instagram Graph API adapter. Backend-only credentials."""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.config import settings
from app.core.errors import AppError

SCOPES = {
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
}
# Debug-token query strings contain credentials; suppress HTTP client's request logging.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class InstagramError(AppError):
    def __init__(
        self,
        message: str,
        code: str = "PROVIDER_ERROR",
        *,
        retryable: bool = False,
        ambiguous: bool = False,
        reconnect: bool = False,
        retry_after: int = 0,
    ):
        super().__init__(message, code=code, status_code=409)
        self.code, self.retryable, self.ambiguous = code, retryable, ambiguous
        self.reconnect, self.retry_after = reconnect, retry_after


class TransientIGError(InstagramError):
    def __init__(self, message: str):
        super().__init__(message, retryable=True)


class PermanentIGError(InstagramError):
    pass


class RealInstagramClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None):
        self.transport = transport

    @property
    def base_url(self) -> str:
        return f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}"

    @property
    def app_secret(self) -> str:
        return settings.INSTAGRAM_APP_SECRET

    def request_url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    async def call(
        self,
        method: str,
        path: str,
        token: str | None = None,
        *,
        publishing: bool = False,
        **params: Any,
    ) -> dict[str, Any]:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            if self.app_secret:
                params["appsecret_proof"] = hmac.new(
                    self.app_secret.encode(), token.encode(), hashlib.sha256
                ).hexdigest()
        try:
            async with httpx.AsyncClient(timeout=30, transport=self.transport) as client:
                response = await client.request(
                    method,
                    self.request_url(path),
                    headers=headers,
                    **({"params": params} if method == "GET" else {"data": params}),
                )
            body = response.json()
            if not isinstance(body, dict):
                raise ValueError("Invalid provider response")
        except (httpx.HTTPError, ValueError):
            raise InstagramError(
                "Meta did not confirm the request. Try again later.",
                "NETWORK_ERROR",
                retryable=not publishing,
                ambiguous=publishing,
            ) from None
        if response.is_error or "error" in body:
            error = body.get("error")
            code = error.get("code") if isinstance(error, dict) else None
            reconnect = code in (10, 102, 190, 200, 294)
            transient = (
                response.status_code >= 500
                or response.status_code == 429
                or code in (1, 2, 4, 17, 32, 613)
            )
            try:
                delay = min(86400, max(0, int(response.headers.get("Retry-After", "0"))))
            except ValueError:
                delay = 0
            raise InstagramError(
                "Reconnect Instagram and grant publishing permissions."
                if reconnect
                else "Meta rejected the request. Check account access and media requirements.",
                "RECONNECT_REQUIRED" if reconnect else "META_REJECTED",
                retryable=transient and not publishing,
                ambiguous=publishing and (transient or code is None),
                reconnect=reconnect,
                retry_after=delay,
            )
        return body

    async def debug_token(self, token: str) -> dict[str, Any]:
        data = (
            await self.call(
                "GET",
                "debug_token",
                f"{settings.INSTAGRAM_APP_ID}|{settings.INSTAGRAM_APP_SECRET}",
                input_token=token,
            )
        ).get("data", {})
        expired = any(
            data.get(key) and int(data[key]) <= datetime.now(UTC).timestamp()
            for key in ("expires_at", "data_access_expires_at")
        )
        if (
            not data.get("is_valid")
            or expired
            or str(data.get("app_id")) != settings.INSTAGRAM_APP_ID
        ):
            raise InstagramError(
                "Instagram authorization expired or was revoked. Reconnect.",
                "RECONNECT_REQUIRED",
                reconnect=True,
            )
        return data

    async def discover_accounts(self, code: str) -> list[dict[str, Any]]:
        short = await self.call(
            "POST",
            "oauth/access_token",
            client_id=settings.INSTAGRAM_APP_ID,
            client_secret=settings.INSTAGRAM_APP_SECRET,
            redirect_uri=settings.INSTAGRAM_REDIRECT_URI,
            code=code,
        )
        long = await self.call(
            "POST",
            "oauth/access_token",
            client_id=settings.INSTAGRAM_APP_ID,
            client_secret=settings.INSTAGRAM_APP_SECRET,
            grant_type="fb_exchange_token",
            fb_exchange_token=short["access_token"],
        )
        token = long["access_token"]
        debug = await self.debug_token(token)
        permissions = await self.call("GET", "me/permissions", token)
        granted = {
            p["permission"] for p in permissions.get("data", []) if p.get("status") == "granted"
        }
        if not SCOPES.issubset(granted):
            raise InstagramError(
                "Grant all four requested publishing permissions.",
                "MISSING_PERMISSIONS",
                reconnect=True,
            )
        result, after = [], None
        for _ in range(20):
            pages = await self.call(
                "GET",
                "me/accounts",
                token,
                fields="id,name,access_token,tasks,instagram_business_account",
                limit=100,
                **({"after": after} if after else {}),
            )
            for page in pages.get("data", []):
                ig_id, page_token = (
                    page.get("instagram_business_account", {}).get("id"),
                    page.get("access_token"),
                )
                if (
                    not ig_id
                    or not page_token
                    or not set(page.get("tasks", [])).intersection(
                        {"CREATE_CONTENT", "MANAGE", "PROFILE_PLUS_CREATE_CONTENT"}
                    )
                ):
                    continue
                account = await self.call(
                    "GET", ig_id, page_token, fields="id,username,profile_picture_url"
                )
                await self.get_content_publishing_limit(ig_id, page_token)
                result.append(
                    {
                        "id": ig_id,
                        "username": account.get("username", ""),
                        "picture": account.get("profile_picture_url"),
                        # Facebook Login's IGUser schema omits Instagram Login's
                        # account_type field. Story eligibility is provider-checked.
                        "account_type": "PAGE_LINKED_PROFESSIONAL",
                        "page_id": page["id"],
                        "page_name": page.get("name", ""),
                        "page_token": page_token,
                        "user_token": token,
                        "meta_user_id": debug.get("user_id"),
                        "scopes": sorted(granted),
                        "expires_at": debug.get("expires_at", 0),
                        "data_access_expires_at": debug.get("data_access_expires_at", 0),
                    }
                )
            after = pages.get("paging", {}).get("cursors", {}).get("after")
            if not pages.get("paging", {}).get("next") or not after:
                break
        if not result:
            raise InstagramError(
                "Facebook did not return an Instagram account you can publish to. Link your Business or Creator account to a Facebook Page, grant this app access to both, and sign in with a user who can create Page content.",
                "NO_BUSINESS_ACCOUNT",
            )
        return result

    async def verify_account(
        self, account_id: str, page_id: str, credentials: dict[str, str]
    ) -> dict[str, Any]:
        debug = await self.debug_token(credentials["user_token"])
        if not SCOPES.issubset(set(debug.get("scopes", []))):
            raise InstagramError(
                "Instagram publishing permissions were removed.",
                "MISSING_PERMISSIONS",
                reconnect=True,
            )
        page = await self.call(
            "GET", page_id, credentials["page_token"], fields="instagram_business_account"
        )
        if str(page.get("instagram_business_account", {}).get("id")) != account_id:
            raise InstagramError(
                "The linked Instagram account changed. Reconnect and review schedules.",
                "ACCOUNT_CHANGED",
                reconnect=True,
            )
        await self.get_content_publishing_limit(account_id, credentials["page_token"])
        return debug

    async def create_media_container(
        self,
        ig_user_id: str,
        media_type: str,
        file_url: str,
        caption: str | None = None,
        thumb_offset: int | None = None,
        access_token: str | None = None,
        *,
        is_video: bool = False,
    ) -> str:
        params: dict[str, Any] = {"video_url" if is_video else "image_url": file_url}
        if media_type != "IMAGE":
            params["media_type"] = media_type
        if caption and media_type != "STORIES":
            params["caption"] = caption
        try:
            data = await self.call("POST", f"{ig_user_id}/media", access_token, **params)
        except InstagramError as exc:
            if media_type == "STORIES" and exc.code == "META_REJECTED" and not exc.retryable:
                raise InstagramError(
                    "Meta rejected this Story. Check account eligibility and Story media "
                    "requirements.",
                    "STORY_NOT_ELIGIBLE",
                ) from None
            raise
        if not data.get("id"):
            raise InstagramError("Meta returned no media container.", "NO_CONTAINER")
        return str(data["id"])

    async def get_container_status(self, creation_id: str, access_token: str | None = None) -> str:
        return str(
            (await self.call("GET", creation_id, access_token, fields="status_code")).get(
                "status_code", "IN_PROGRESS"
            )
        )

    async def publish_container(
        self, ig_user_id: str, creation_id: str, access_token: str | None = None
    ) -> dict[str, str]:
        data = await self.call(
            "POST",
            f"{ig_user_id}/media_publish",
            access_token,
            publishing=True,
            creation_id=creation_id,
        )
        if not data.get("id"):
            raise InstagramError(
                "Meta did not return a published media ID.", "UNCONFIRMED", ambiguous=True
            )
        return {"media_id": str(data["id"])}

    async def media_permalink(self, media_id: str, token: str) -> str | None:
        return (await self.call("GET", media_id, token, fields="permalink")).get("permalink")

    async def get_content_publishing_limit(
        self, ig_user_id: str, access_token: str | None = None
    ) -> dict[str, int]:
        data = await self.call(
            "GET",
            f"{ig_user_id}/content_publishing_limit",
            access_token,
            fields="quota_usage,config",
        )
        rows = data.get("data", [])
        if not rows or not rows[0].get("config", {}).get("quota_total"):
            raise InstagramError(
                "Meta publishing quota is unavailable.", "QUOTA_UNAVAILABLE", retryable=True
            )
        return {
            "quota_usage": int(rows[0].get("quota_usage", 0)),
            "quota_total": int(rows[0]["config"]["quota_total"]),
        }

    async def revoke(self, credentials: dict[str, str]) -> None:
        await self.call("DELETE", "me/permissions", credentials["user_token"])


def get_instagram_client() -> RealInstagramClient:
    # Tests use MockTransport. Runtime code cannot manufacture publication success.
    return RealInstagramClient()
