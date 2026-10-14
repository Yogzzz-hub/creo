"""Google sign-in exchange: fewest possible round trips, bounded wait, no pointless retries."""

import base64
import json

import httpx
import pytest

from app.routers import auth


def id_token(**claims) -> str:
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"header.{payload}.signature"


class FakeGoogle:
    """Stands in for the shared httpx client, recording every call in order."""

    def __init__(self, token_responses, userinfo=None):
        self.token_responses = list(token_responses)
        self.userinfo = userinfo
        self.calls: list[tuple[str, str]] = []

    async def post(self, url, data=None, **_):
        self.calls.append(("token", data["redirect_uri"]))
        status, body = self.token_responses.pop(0)
        return httpx.Response(status, json=body)

    async def get(self, url, **_):
        self.calls.append(("userinfo", url))
        return httpx.Response(200, json=self.userinfo or {})


@pytest.fixture(autouse=True)
def google_credentials(monkeypatch):
    monkeypatch.setattr(auth.settings, "GOOGLE_CLIENT_ID", "client")
    monkeypatch.setattr(auth.settings, "GOOGLE_CLIENT_SECRET", "secret")


def use(monkeypatch, fake):
    monkeypatch.setattr(auth, "_google_client", lambda: fake)


@pytest.mark.asyncio
async def test_profile_comes_from_the_id_token_without_a_userinfo_call(monkeypatch):
    token = id_token(sub="123", email="a@b.co", email_verified=True, name="Ada")
    fake = FakeGoogle([(200, {"access_token": "at", "id_token": token})])
    use(monkeypatch, fake)

    profile = await auth._fetch_google_profile("code", "https://site/auth/google/callback")

    assert profile["email"] == "a@b.co" and profile["id"] == "123" and profile["verified_email"] is True
    assert fake.calls == [("token", "https://site/auth/google/callback")]


@pytest.mark.asyncio
async def test_userinfo_is_the_fallback_when_there_is_no_id_token(monkeypatch):
    fake = FakeGoogle([(200, {"access_token": "at"})], userinfo={"id": "1", "email": "a@b.co", "verified_email": True})
    use(monkeypatch, fake)

    profile = await auth._fetch_google_profile("code", "https://site/auth/google/callback")

    assert profile["email"] == "a@b.co"
    assert [kind for kind, _ in fake.calls] == ["token", "userinfo"]


@pytest.mark.asyncio
async def test_an_expired_code_is_not_retried_against_other_redirect_uris(monkeypatch):
    fake = FakeGoogle([(400, {"error": "invalid_grant"})])
    use(monkeypatch, fake)

    assert await auth._fetch_google_profile("code", "https://site/auth/google/callback") == {}
    assert len(fake.calls) == 1


@pytest.mark.asyncio
async def test_other_redirect_uris_are_tried_only_after_a_redirect_uri_mismatch(monkeypatch):
    token = id_token(sub="1", email="a@b.co", email_verified=True)
    fake = FakeGoogle([(400, {"error": "redirect_uri_mismatch"}), (200, {"id_token": token})])
    use(monkeypatch, fake)

    profile = await auth._fetch_google_profile("code", "https://site/auth/google/callback")

    assert profile["email"] == "a@b.co"
    assert len(fake.calls) == 2 and fake.calls[0][1] != fake.calls[1][1]


@pytest.mark.asyncio
async def test_unreachable_google_fails_fast_with_a_clear_error(monkeypatch):
    class Down:
        async def post(self, *_, **__):
            raise httpx.ConnectTimeout("no route")

    use(monkeypatch, Down())

    with pytest.raises(auth.HTTPException) as caught:
        await auth._fetch_google_profile("code", "https://site/auth/google/callback")
    assert caught.value.status_code == 502
