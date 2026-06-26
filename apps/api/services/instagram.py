import logging

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


def _sanitize_meta_response(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    sanitized = {}
    for k, v in data.items():
        if k in ("access_token", "fb_exchange_token", "client_secret", "user_id"):
            sanitized[k] = "***MASKED***"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_meta_response(v)
        else:
            sanitized[k] = v
    return sanitized


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
        logger.error("Meta OAuth response missing access_token: %s", _sanitize_meta_response(data))
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
        logger.error("Meta token exchange response missing access_token: %s", _sanitize_meta_response(data))
        raise ValueError("Failed to exchange for long-lived Instagram access token")

    expires_in = data.get("expires_in", "unknown")
    logger.info(
        "Successfully obtained long-lived Instagram access token (expires_in=%s)",
        expires_in,
    )
    return long_lived_token


async def refresh_access_token(current_token: str) -> dict:
    """Refresh an Instagram long-lived access token.

    Calls the Graph API with grant_type=ig_refresh_token to obtain a fresh
    long-lived token. Returns a dict with the new token and expiry info.

    Returns:
        A dict containing:
            - access_token: The refreshed long-lived token.
            - token_type: Always "bearer".
            - expires_in: Seconds until the new token expires.
    """
    url = f"{GRAPH_API_BASE}/oauth/access_token"
    payload = {
        "grant_type": "ig_refresh_token",
        "access_token": current_token,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=payload)
        response.raise_for_status()
        data = response.json()

    new_token = data.get("access_token")
    if not new_token:
        logger.error("Meta token refresh response missing access_token: %s", _sanitize_meta_response(data))
        raise ValueError("Failed to refresh Instagram access token")

    expires_in = data.get("expires_in", "unknown")
    logger.info(
        "Successfully refreshed Instagram access token (expires_in=%s)",
        expires_in,
    )

    return {
        "access_token": new_token,
        "token_type": data.get("token_type", "bearer"),
        "expires_in": expires_in,
    }


async def publish_media(
    ig_user_id: str,
    access_token: str,
    image_url: str,
    caption: str,
) -> dict:
    """Publish an image to Instagram via the Graph API.

    Two-step process:
    1. Create a media container by POSTing to /{ig_user_id}/media
    2. Publish the container by POSTing to /{ig_user_id}/media_publish

    Args:
        ig_user_id: The Instagram Business/Creator account user ID.
        access_token: A valid long-lived access token.
        image_url: A publicly accessible URL of the image to publish.
        caption: The caption text for the Instagram post.

    Returns:
        A dict containing:
            - id: The Instagram media ID of the published post.
            - success: Boolean indicating success.

    Raises:
        ValueError: If the API response is missing required data.
        RuntimeError: If the API call fails.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        container_id = await _create_media_container(
            client, ig_user_id, access_token, image_url, caption
        )
        published_id = await _publish_container(
            client, ig_user_id, access_token, container_id
        )

    logger.info(
        "Successfully published Instagram media: ig_user=%s post_id=%s",
        ig_user_id,
        published_id,
    )

    return {
        "id": published_id,
        "success": True,
    }


async def _create_media_container(
    client: httpx.AsyncClient,
    ig_user_id: str,
    access_token: str,
    image_url: str,
    caption: str,
) -> str:
    """Step A: Create a media container for the image."""
    url = f"{GRAPH_API_BASE}/{ig_user_id}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": access_token,
    }

    response = await client.post(url, data=payload)

    if response.status_code != 200:
        logger.error(
            "Failed to create Instagram media container: status=%d body=%s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"Instagram media container creation failed with status "
            f"{response.status_code}: {response.text}"
        )

    data = response.json()
    container_id = data.get("id")
    if not container_id:
        logger.error("Instagram container response missing id: %s", _sanitize_meta_response(data))
        raise ValueError("Instagram media container response missing id field")

    logger.info("Created Instagram media container: id=%s", container_id)
    return container_id


async def _publish_container(
    client: httpx.AsyncClient,
    ig_user_id: str,
    access_token: str,
    container_id: str,
) -> str:
    """Step B: Publish a previously created media container."""
    url = f"{GRAPH_API_BASE}/{ig_user_id}/media_publish"
    payload = {
        "creation_id": container_id,
        "access_token": access_token,
    }

    response = await client.post(url, data=payload)

    if response.status_code != 200:
        logger.error(
            "Failed to publish Instagram media: status=%d body=%s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"Instagram media publish failed with status "
            f"{response.status_code}: {response.text}"
        )

    data = response.json()
    published_id = data.get("id")
    if not published_id:
        logger.error("Instagram publish response missing id: %s", _sanitize_meta_response(data))
        raise ValueError("Instagram media publish response missing id field")

    return published_id
