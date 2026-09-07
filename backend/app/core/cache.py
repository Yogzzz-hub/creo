"""Redis cache and session revocation foundation.

Handles instant session invalidation, token revocation checking, and rate-limiting cache.
Supports both real Redis and in-memory fakeredis.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# Module-level client and in-memory fallback
_redis_client: Any = None
_in_memory_suspended: set[str] = set()
_redis_last_failure: float = 0.0


async def get_redis() -> Any:
    """Acquire or initialize the shared async Redis client."""
    global _redis_client
    if _redis_client is None:
        if settings.REDIS_URL.startswith("fakeredis"):
            from fakeredis import aioredis as fake_aioredis

            _redis_client = fake_aioredis.FakeRedis(decode_responses=True)
        else:
            _redis_client = aioredis.from_url(  # type: ignore[no-untyped-call]
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2,
            )
    return _redis_client


async def invalidate_user_session(user_id: uuid.UUID | str) -> None:
    """Invalidate all live sessions for a user upon suspension or password/token reset."""
    global _redis_last_failure
    uid = str(user_id)
    _in_memory_suspended.add(uid)
    import time
    if time.time() - _redis_last_failure < 30.0:
        return
    try:
        r = await get_redis()
        await r.setex(f"user:suspended:{uid}", 86400 * 30, "1")
        await r.delete(f"user:session:{uid}")
    except Exception as e:
        _redis_last_failure = time.time()
        logger.debug("Redis not available for session invalidation: %s", e)


async def is_user_suspended_in_cache(user_id: uuid.UUID | str) -> bool:
    """Check if the user has been revoked/suspended in cache."""
    global _redis_last_failure
    uid = str(user_id)
    if uid in _in_memory_suspended:
        return True
    import time
    if time.time() - _redis_last_failure < 30.0:
        return False
    try:
        r = await get_redis()
        val = await r.get(f"user:suspended:{uid}")
        if val == "1":
            _in_memory_suspended.add(uid)
            return True
    except Exception as e:
        _redis_last_failure = time.time()
        logger.debug("Redis not available for suspension check: %s", e)
    return False


def clear_in_memory_cache() -> None:
    """Helper for test isolation."""
    _in_memory_suspended.clear()
