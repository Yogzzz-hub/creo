"""Unit tests for Gemini multi-key pool, 20 req/day quota enforcement, and automatic fallback failover."""

import pytest
from unittest.mock import patch, AsyncMock
import httpx

from app.config import settings
from app.services.gemini_client import (
    get_gemini_key_pool,
    normalize_key,
    generate_gemini_content,
    record_key_success,
    mark_key_exhausted,
    is_key_usable_today,
    reset_daily_key_usage,
    get_key_quota_status,
    MAX_KEY_DAILY_REQUESTS,
)


@pytest.fixture(autouse=True)
async def clear_key_state():
    await reset_daily_key_usage()
    yield
    await reset_daily_key_usage()


def test_key_normalization():
    assert normalize_key("AQ.AQ.MockKeyForTestingNormalization123") == "AQ.MockKeyForTestingNormalization123"
    assert normalize_key("  MockKeyWithWhitespace  ") == "MockKeyWithWhitespace"
    assert normalize_key("'AQ.MockKeyWrappedInQuotes'") == "AQ.MockKeyWrappedInQuotes"


def test_key_pool_loading_and_deduplication(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "AQ.AQ.primary_key_test")
    monkeypatch.setattr(
        settings,
        "GEMINI_FALLBACK_KEYS",
        ["fallback_1", "fallback_2", "AQ.primary_key_test", "fallback_1"],
    )

    pool = get_gemini_key_pool()
    assert pool == ["AQ.primary_key_test", "fallback_1", "fallback_2"]


def test_key_pool_empty_when_primary_disabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_KEYS", ["fallback_1", "fallback_2"])

    pool = get_gemini_key_pool()
    assert pool == []


@pytest.mark.asyncio
async def test_20_requests_per_day_quota_cap():
    key = "test_quota_key"
    assert await is_key_usable_today(key) is True

    # Record 19 requests
    for i in range(19):
        used = await record_key_success(key)
        assert used == i + 1
        assert await is_key_usable_today(key) is True

    # 20th request reaches daily cap
    used_20 = await record_key_success(key)
    assert used_20 == MAX_KEY_DAILY_REQUESTS
    assert await is_key_usable_today(key) is False


@pytest.mark.asyncio
async def test_automatic_failover_when_primary_limit_reached(monkeypatch: pytest.MonkeyPatch):
    primary = "key_primary"
    fallback = "key_fallback_1"

    monkeypatch.setattr(settings, "GEMINI_API_KEY", primary)
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_KEYS", [fallback])

    # Mark primary key exhausted
    await mark_key_exhausted(primary, reason="20_req_limit_reached")
    assert await is_key_usable_today(primary) is False
    assert await is_key_usable_today(fallback) is True

    # Mock httpx response to succeed on fallback
    mock_resp = httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": '{"result": "success"}'}]}}]},
        request=httpx.Request("POST", "http://test"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res_data, key_used = await generate_gemini_content({"contents": []})

        assert res_data is not None
        assert "candidates" in res_data
        # Verified that primary was skipped and fallback was called
        assert mock_post.call_count == 1
        call_url = str(mock_post.call_args[0][0])
        assert f"key={fallback}" in call_url


@pytest.mark.asyncio
async def test_429_quota_exceeded_triggers_immediate_failover(monkeypatch: pytest.MonkeyPatch):
    primary = "key_primary_429"
    fallback = "key_fallback_after_429"

    monkeypatch.setattr(settings, "GEMINI_API_KEY", primary)
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_KEYS", [fallback])

    resp_429 = httpx.Response(
        429,
        json={"error": {"code": 429, "message": "RESOURCE_EXHAUSTED"}},
        request=httpx.Request("POST", "http://test"),
    )
    resp_200 = httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": '{"status": "ok"}'}]}}]},
        request=httpx.Request("POST", "http://test"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # First call (primary) gets 429, second call (fallback) gets 200
        mock_post.side_effect = [resp_429, resp_200]

        res_data, key_used = await generate_gemini_content({"contents": []})

        assert res_data is not None
        assert mock_post.call_count == 2
        # Primary is now marked exhausted
        assert await is_key_usable_today(primary) is False
        # Fallback recorded success
        assert await is_key_usable_today(fallback) is True


@pytest.mark.asyncio
async def test_all_keys_failed_returns_none_gracefully(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "key_1")
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_KEYS", ["key_2"])

    resp_500 = httpx.Response(
        500,
        json={"error": "Internal Error"},
        request=httpx.Request("POST", "http://test"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = resp_500
        res_data, key_used = await generate_gemini_content({"contents": []})

        # Returns None, None gracefully without raising exception
        assert res_data is None
        assert key_used is None


@pytest.mark.asyncio
async def test_quota_status_tracking(monkeypatch: pytest.MonkeyPatch):
    primary = "key_status_prim"
    fb = "key_status_fb"

    monkeypatch.setattr(settings, "GEMINI_API_KEY", primary)
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_KEYS", [fb])

    await record_key_success(primary)
    await record_key_success(primary)

    status = await get_key_quota_status()
    assert len(status) == 2
    assert status[0]["requests_used_today"] == 2
    assert status[0]["remaining_today"] == 18
    assert status[0]["is_exhausted"] is False

    assert status[1]["requests_used_today"] == 0
    assert status[1]["remaining_today"] == 20
    assert status[1]["is_exhausted"] is False
