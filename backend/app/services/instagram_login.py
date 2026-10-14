"""Instagram Login adapter: professional account tokens, no Facebook Page required."""

from datetime import UTC, datetime
from typing import Any

from app.config import settings
from app.services.instagram_client import InstagramError, RealInstagramClient

LOGIN_SCOPES = {"instagram_business_basic", "instagram_business_content_publish"}


class DirectInstagramClient(RealInstagramClient):
    @property
    def base_url(self) -> str:
        return f"https://graph.instagram.com/{settings.META_GRAPH_API_VERSION}"

    @property
    def app_secret(self) -> str:
        # Instagram User tokens are sent as Bearer tokens, never with a Facebook
        # appsecret_proof or Facebook app credentials.
        return ""

    def request_url(self, path: str) -> str:
        if path == "oauth/access_token":
            return "https://api.instagram.com/oauth/access_token"
        if path == "access_token":
            return "https://graph.instagram.com/access_token"
        return super().request_url(path)

    async def permissions(self, token: str) -> set[str]:
        data = await self.call("GET", "me/permissions", token)
        granted = {
            p.get("permission") for p in data.get("data", []) if p.get("status") == "granted"
        }
        if not LOGIN_SCOPES.issubset(granted):
            raise InstagramError(
                "Grant Instagram profile and publishing access to connect.",
                "MISSING_PERMISSIONS",
                reconnect=True,
            )
        return granted

    async def call(self, method, path, token=None, **params):
        try:
            return await super().call(method, path, token, **params)
        except InstagramError as exc:
            if path in ("oauth/access_token", "access_token"):
                raise InstagramError(
                    "Instagram could not complete authorization. Check the Instagram Login app secret and exact registered redirect URI, then start a new connection.",
                    "INSTAGRAM_TOKEN_EXCHANGE_FAILED",
                    reconnect=True,
                ) from None
            if path == "me/permissions":
                raise InstagramError(
                    "Instagram could not verify your permissions. Grant profile and publishing access and check the account's app access.",
                    "INSTAGRAM_PERMISSION_CHECK_FAILED",
                    reconnect=True,
                ) from None
            raise

    async def discover_accounts(self, code: str) -> list[dict[str, Any]]:
        short = await self.call(
            "POST",
            "oauth/access_token",
            client_id=settings.INSTAGRAM_LOGIN_APP_ID,
            client_secret=settings.INSTAGRAM_LOGIN_APP_SECRET,
            grant_type="authorization_code",
            redirect_uri=settings.INSTAGRAM_REDIRECT_URI,
            code=code,
        )
        # Meta has returned both flat and data-wrapped exchange responses.
        if "data" in short:
            rows = short["data"]
            if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict):
                raise InstagramError("Instagram returned an invalid authorization response.")
            short = rows[0]
        if not short.get("access_token") or not short.get("user_id"):
            raise InstagramError("Instagram did not return an account token.")
        long = await self.call(
            "GET",
            "access_token",
            grant_type="ig_exchange_token",
            client_secret=settings.INSTAGRAM_LOGIN_APP_SECRET,
            access_token=short["access_token"],
        )
        token = long.get("access_token")
        if not token or not long.get("expires_in") or int(long["expires_in"]) <= 0:
            raise InstagramError("Instagram did not return a valid long-lived token.")
        granted = await self.permissions(token)
        account = await self.call("GET", "me", token, fields="user_id,username,account_type")
        account_id = str(account.get("user_id") or "")
        if account_id != str(short["user_id"]) or account.get("account_type") not in (
            "BUSINESS",
            "MEDIA_CREATOR",
            "CREATOR",
        ):
            raise InstagramError(
                "Connect an Instagram Business or Creator account.", "NO_BUSINESS_ACCOUNT"
            )
        await self.get_content_publishing_limit(account_id, token)
        return [
            {
                "id": account_id,
                "username": account.get("username", ""),
                "account_type": account["account_type"],
                "provider": "instagram",
                "page_id": "",
                "page_name": "",
                "page_token": token,
                "user_token": token,
                "scopes": sorted(granted),
                "expires_at": int(datetime.now(UTC).timestamp()) + int(long["expires_in"]),
            }
        ]

    async def verify_account(
        self, account_id: str, page_id: str, credentials: dict[str, str]
    ) -> dict:
        token = credentials["user_token"]
        await self.permissions(token)
        account = await self.call("GET", "me", token, fields="user_id,account_type")
        if str(account.get("user_id")) != account_id:
            raise InstagramError(
                "The authorized Instagram account changed. Reconnect.",
                "ACCOUNT_CHANGED",
                reconnect=True,
            )
        if account.get("account_type") not in ("BUSINESS", "MEDIA_CREATOR", "CREATOR"):
            raise InstagramError(
                "An Instagram professional account is required.",
                "NO_BUSINESS_ACCOUNT",
                reconnect=True,
            )
        await self.get_content_publishing_limit(account_id, token)
        return account


def client_for_provider(provider: str = "facebook") -> RealInstagramClient:
    from app.services.instagram_client import get_instagram_client

    if provider == "instagram":
        return DirectInstagramClient()
    if provider != "facebook":
        raise InstagramError("Unknown Instagram connection provider.")
    return get_instagram_client()
