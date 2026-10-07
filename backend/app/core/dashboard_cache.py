"""Short-lived shared dashboard snapshots, after endpoint authentication.

Never cache tokens or authorization decisions. A shared generation prevents a
read started before a mutation from publishing its old result after the write.
Background updates remain bounded by the 15 second TTL.
"""

import asyncio
import hashlib
import inspect
import json
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any, get_type_hints
from weakref import WeakValueDictionary

from fastapi.encoders import jsonable_encoder

from app.core.cache import get_redis

GENERATION_KEY = "creo:dashboard:v1:generation"
# Dependencies that are not part of a snapshot's identity. The request only
# supplies the API origin for media URLs, which is the same for every caller.
_UNCACHED_ARGS = ("actor", "db", "request")
_locks: WeakValueDictionary[str, asyncio.Lock] = WeakValueDictionary()
_PUBLISH = """
if (redis.call('GET', KEYS[1]) or '0') == ARGV[1] then
    return redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
end
return nil
"""


async def invalidate_dashboard_cache() -> None:
    try:
        async with asyncio.timeout(0.5):
            redis = await get_redis()
            await redis.incr(GENERATION_KEY)
    except Exception:
        # Cache availability must never determine whether a write succeeds.
        pass


def dashboard_cached(ttl: int = 15) -> Callable[[Callable[..., Awaitable[Any]]], Callable[..., Awaitable[Any]]]:
    def decorate(endpoint: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        signature = inspect.signature(endpoint)
        hints = get_type_hints(endpoint)

        @wraps(endpoint)
        async def wrapped(*args: Any, **kwargs: Any) -> Any:
            bound = signature.bind(*args, **kwargs)
            bound.apply_defaults()
            actor = bound.arguments.get("actor")
            # Direct tests or non-authenticated callers never enter the cache.
            if actor is None or not hasattr(actor, "user_id"):
                return await endpoint(*args, **kwargs)
            scope = [str(actor.user_id), str(actor.agency_id), str(actor.client_id),
                     str(actor.role), actor.email]
            parameters = {k: v for k, v in bound.arguments.items() if k not in _UNCACHED_ARGS}
            identity = json.dumps([endpoint.__module__, endpoint.__name__, scope,
                                   jsonable_encoder(parameters)], sort_keys=True)
            key = "creo:dashboard:v1:" + hashlib.sha256(identity.encode()).hexdigest()
            redis = None
            generation = None
            try:
                async with asyncio.timeout(0.5):
                    redis = await get_redis()
                    current, cached = await redis.mget(GENERATION_KEY, key)
                    generation = current or "0"
                    if cached:
                        snapshot = json.loads(cached)
                        if snapshot["generation"] == generation:
                            return snapshot["value"]
            except Exception:
                redis = None
            result = await endpoint(*args, **kwargs)
            if redis is not None:
                try:
                    snapshot = json.dumps({"generation": generation, "value": jsonable_encoder(result)})
                    if len(snapshot.encode()) <= 1_000_000:
                        async with asyncio.timeout(0.5):
                            await redis.eval(_PUBLISH, 2, GENERATION_KEY, key,
                                             generation, snapshot, ttl)
                except Exception:
                    pass
            return result

        @wraps(endpoint)
        async def serialized(*args: Any, **kwargs: Any) -> Any:
            bound = signature.bind(*args, **kwargs)
            bound.apply_defaults()
            actor = bound.arguments.get("actor")
            if actor is None or not hasattr(actor, "user_id"):
                return await wrapped(*args, **kwargs)
            identity = json.dumps([endpoint.__module__, endpoint.__name__,
                str(actor.user_id), str(actor.agency_id), str(actor.client_id),
                str(actor.role), actor.email,
                jsonable_encoder({k: v for k, v in bound.arguments.items()
                                  if k not in _UNCACHED_ARGS})], sort_keys=True)
            key = hashlib.sha256(identity.encode()).hexdigest()
            lock = _locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                _locks[key] = lock
            # Recheck the shared snapshot after waiting. Weak references keep
            # completed keys from accumulating. Separate processes may still
            # perform one refresh each; no distributed lock can strand a reader.
            async with lock:
                return await wrapped(*args, **kwargs)

        # Resolve postponed annotations in the endpoint's original module so
        # FastAPI still runs its existing actor and database dependencies.
        setattr(serialized, "__signature__", signature.replace(
            parameters=[p.replace(annotation=hints.get(name, p.annotation))
                        for name, p in signature.parameters.items()],
            return_annotation=hints.get("return", signature.return_annotation),
        ))
        return serialized
    return decorate
