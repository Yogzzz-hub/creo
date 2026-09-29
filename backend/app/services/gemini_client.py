"""Gemini AI client with automatic multi-account key rotation and 20 req/day quota failover.

Architecture:
- Manages primary and fallback Gemini API key pool.
- Enforces 20 requests/day per account limit with automatic daily reset.
- Catches HTTP 429 (Resource Exhausted / Quota Exceeded), 401/403 (Invalid/Forbidden),
  and automatically fails over to the next healthy key in the pool.
- Automatically normalizes key prefixes (e.g. cleans accidental duplicate AQ.AQ. to AQ.).
- Rotates across supported models (gemini-3.6-flash, gemini-2.5-flash, gemini-flash-latest).
- Thread/async safe operation without interrupting caller workflows.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime
from typing import Any

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Quota limit per key account per day
MAX_KEY_DAILY_REQUESTS = 20

# In-memory tracking of daily key usage and quota exhaustion
# {normalized_key: (date, count)}
_DAILY_KEY_USAGE: dict[str, tuple[date, int]] = {}
# {normalized_key: date}
_EXHAUSTED_KEYS_TODAY: dict[str, date] = {}
_USAGE_LOCK = asyncio.Lock()

# Candidate models in order of priority
DEFAULT_CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash",
]


def mask_key(key: str) -> str:
    """Mask key for safe logging (e.g. AIzaSy...RPs or AQ.Ab8...ySA)."""
    if not key or len(key) <= 10:
        return "***"
    return f"{key[:8]}...{key[-4:]}"


def normalize_key(key: str) -> str:
    """Normalize Gemini key: strip whitespace and repair double prefix if present."""
    k = key.strip().strip("'").strip('"')
    if k.startswith("AQ.AQ."):
        k = k.replace("AQ.AQ.", "AQ.", 1)
    return k


def get_gemini_key_pool() -> list[str]:
    """Retrieve the deduplicated pool of Gemini keys in priority order.
    
    If settings.GEMINI_API_KEY is empty / None, returns an empty list
    (respecting unit test monkeypatching that disables Gemini).
    """
    primary = getattr(settings, "GEMINI_API_KEY", "") or ""
    if not primary:
        return []

    pool: list[str] = []
    normalized_primary = normalize_key(primary)
    if normalized_primary:
        pool.append(normalized_primary)

    fallback_keys = getattr(settings, "GEMINI_FALLBACK_KEYS", []) or []
    if isinstance(fallback_keys, str):
        import json
        try:
            parsed = json.loads(fallback_keys)
            if isinstance(parsed, list):
                fallback_keys = parsed
            else:
                fallback_keys = [k.strip() for k in fallback_keys.split(",") if k.strip()]
        except Exception:
            fallback_keys = [k.strip() for k in fallback_keys.split(",") if k.strip()]

    for fb in fallback_keys:
        norm = normalize_key(str(fb))
        if norm and norm not in pool:
            pool.append(norm)

    return pool


async def get_key_usage(key: str) -> int:
    """Get request count used today for this key."""
    today = datetime.now(UTC).date()
    async with _USAGE_LOCK:
        if key in _DAILY_KEY_USAGE:
            usage_date, count = _DAILY_KEY_USAGE[key]
            if usage_date == today:
                return count
        return 0


async def record_key_success(key: str) -> int:
    """Record a successful request for this key and update daily quota tracking."""
    today = datetime.now(UTC).date()
    async with _USAGE_LOCK:
        current_count = 0
        if key in _DAILY_KEY_USAGE:
            usage_date, count = _DAILY_KEY_USAGE[key]
            if usage_date == today:
                current_count = count
        
        new_count = current_count + 1
        _DAILY_KEY_USAGE[key] = (today, new_count)
        
        if new_count >= MAX_KEY_DAILY_REQUESTS:
            _EXHAUSTED_KEYS_TODAY[key] = today
            logger.info(
                "gemini_key_daily_quota_reached_20",
                key=mask_key(key),
                used=new_count,
                max=MAX_KEY_DAILY_REQUESTS,
            )
        return new_count


async def mark_key_exhausted(key: str, reason: str = "quota_exceeded") -> None:
    """Mark a key as exhausted for today (due to 429, 20 requests reached, or 403)."""
    today = datetime.now(UTC).date()
    async with _USAGE_LOCK:
        _EXHAUSTED_KEYS_TODAY[key] = today
        _DAILY_KEY_USAGE[key] = (today, MAX_KEY_DAILY_REQUESTS)
        logger.warning(
            "gemini_key_marked_exhausted_for_today",
            key=mask_key(key),
            reason=reason,
        )


async def is_key_usable_today(key: str) -> bool:
    """Check if key has remaining quota for today."""
    today = datetime.now(UTC).date()
    async with _USAGE_LOCK:
        if _EXHAUSTED_KEYS_TODAY.get(key) == today:
            return False
        if key in _DAILY_KEY_USAGE:
            usage_date, count = _DAILY_KEY_USAGE[key]
            if usage_date == today and count >= MAX_KEY_DAILY_REQUESTS:
                _EXHAUSTED_KEYS_TODAY[key] = today
                return False
        return True


async def reset_daily_key_usage() -> None:
    """Reset key usage tracking (primarily for testing and admin operations)."""
    async with _USAGE_LOCK:
        _DAILY_KEY_USAGE.clear()
        _EXHAUSTED_KEYS_TODAY.clear()


async def get_key_quota_status() -> list[dict[str, Any]]:
    """Return status of all configured keys in the pool."""
    keys = get_gemini_key_pool()
    today = datetime.now(UTC).date()
    status_list = []
    async with _USAGE_LOCK:
        for idx, k in enumerate(keys):
            used = 0
            if k in _DAILY_KEY_USAGE:
                u_date, count = _DAILY_KEY_USAGE[k]
                if u_date == today:
                    used = count
            is_exhausted = (_EXHAUSTED_KEYS_TODAY.get(k) == today) or (used >= MAX_KEY_DAILY_REQUESTS)
            status_list.append({
                "index": idx,
                "role": "primary" if idx == 0 else f"fallback_{idx}",
                "key_masked": mask_key(k),
                "requests_used_today": used,
                "requests_limit_per_day": MAX_KEY_DAILY_REQUESTS,
                "remaining_today": max(0, MAX_KEY_DAILY_REQUESTS - used),
                "is_exhausted": is_exhausted,
            })
    return status_list


async def generate_gemini_content(
    payload: dict[str, Any],
    candidate_models: list[str] | None = None,
    timeout: float = 20.0,
) -> tuple[dict[str, Any] | None, str | None]:
    """Execute generateContent against Gemini API with automatic key rotation and model failover.
    
    Returns:
        tuple[dict[str, Any] | None, str | None]:
            (response_data, masked_key_used) on success, or (None, None) if all keys failed.
    """
    key_pool = get_gemini_key_pool()
    if not key_pool:
        return None, None

    models_to_try = candidate_models or DEFAULT_CANDIDATE_MODELS

    for idx, key in enumerate(key_pool):
        if not await is_key_usable_today(key):
            logger.info(
                "gemini_key_skipped_quota_exhausted",
                key_index=idx,
                key=mask_key(key),
            )
            continue

        key_succeeded = False
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    res = await client.post(url, json=payload)

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates") or []
                    if candidates:
                        await record_key_success(key)
                        logger.info(
                            "gemini_generation_succeeded",
                            key_index=idx,
                            key=mask_key(key),
                            model=model,
                        )
                        return data, mask_key(key)

                elif res.status_code == 429:
                    # Daily quota or rate limit exceeded on this key
                    logger.warning(
                        "gemini_quota_limit_429_received",
                        key_index=idx,
                        key=mask_key(key),
                        model=model,
                        message="Falling back to next key account automatically",
                    )
                    await mark_key_exhausted(key, reason="429_quota_exceeded")
                    # Break out of model loop to try the NEXT KEY immediately
                    break

                elif res.status_code == 404:
                    # Model not found or deprecated for this key version; try next model
                    logger.debug(
                        "gemini_model_not_found_trying_next_model",
                        key=mask_key(key),
                        model=model,
                    )
                    continue

                elif res.status_code in (400, 401, 403):
                    # Key invalid or project access denied
                    logger.warning(
                        "gemini_key_access_denied_or_invalid",
                        key_index=idx,
                        key=mask_key(key),
                        status_code=res.status_code,
                        response=res.text[:120],
                    )
                    await mark_key_exhausted(key, reason=f"http_{res.status_code}")
                    # Break out of model loop to try the NEXT KEY immediately
                    break

                else:
                    logger.warning(
                        "gemini_unexpected_status",
                        key=mask_key(key),
                        model=model,
                        status_code=res.status_code,
                    )
            except Exception as err:
                logger.warning(
                    "gemini_request_exception",
                    key=mask_key(key),
                    model=model,
                    error=str(err),
                )
                continue

    logger.warning("all_gemini_keys_exhausted_or_failed_falling_back_to_next_tier")
    return None, None
