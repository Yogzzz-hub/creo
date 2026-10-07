import pytest

from app.core.build_info import get_build_revision


@pytest.mark.parametrize(
    "value, expected",
    [
        ("", None),
        ("not-a-commit", None),
        ("<script>untrusted</script>", None),
        ("A" * 40, "a" * 40),
    ],
)
def test_build_revision_exposes_only_a_valid_commit(monkeypatch, value, expected):
    monkeypatch.setenv("RENDER_GIT_COMMIT", value)
    monkeypatch.delenv("GIT_COMMIT_SHA", raising=False)
    assert get_build_revision() == expected


def test_alternative_host_revision_is_supported(monkeypatch):
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.setenv("GIT_COMMIT_SHA", "b" * 40)
    assert get_build_revision() == "b" * 40


@pytest.mark.asyncio
async def test_public_api_identifies_deployed_revision(monkeypatch):
    import httpx

    from app.main import app

    monkeypatch.setenv("RENDER_GIT_COMMIT", "c" * 40)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as api:
        response = await api.get("/")
    assert response.status_code == 200
    assert response.json()["build_revision"] == "c" * 40
