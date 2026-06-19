import logging

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


async def exchange_instagram_token(code: str, redirect_uri: str) -> str:
    """Exchange a short-lived OAuth code for a long-lived Instagram access token.

    1. Exchange the authorization code for a short-lived user token.
    2. Exchange the short-lived token for a long-lived token (~60 days).
    3. Return the long-lived token string.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        short_lived_token = await _get_short_lived_token(client, code, redirect_uri)
        long_lived_token = await _get_long_lived_token(client, short_lived_token)
        return long_lived_token


async def _get_short_lived_token(
    client: httpx.AsyncClient, code: str, redirect_uri: str
) -> str:
    url = f"{GRAPH_API_BASE}/oauth/access_token"
    payload = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "redirect_uri": redirect_uri,
        "code": code,
        "grant_type": "authorization_code",
    }

    response = await client.post(url, data=payload)
    response.raise_for_status()
    data = response.json()

    access_token = data.get("access_token")
    if not access_token:
        logger.error("Meta OAuth response missing access_token: %s", data)
        raise ValueError("Failed to obtain short-lived access token from Meta")

    logger.info("Successfully obtained short-lived Instagram access token")
    return access_token


async def _get_long_lived_token(client: httpx.AsyncClient, short_lived_token: str) -> str:
    url = f"{GRAPH_API_BASE}/oauth/access_token"
    payload = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.INSTAGRAM_APP_ID,
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    }

    response = await client.post(url, data=payload)
    response.raise_for_status()
    data = response.json()

    long_lived_token = data.get("access_token")
    if not long_lived_token:
        logger.error("Meta token exchange response missing access_token: %s", data)
        raise ValueError("Failed to exchange for long-lived Instagram access token")

    expires_in = data.get("expires_in", "unknown")
    logger.info(
        "Successfully obtained long-lived Instagram access token (expires_in=%s)",
        expires_in,
    )
    return long_lived_token
