"""Isolated source-function tests; no database, credentials, or application startup.

The complete router suite still requires the backend's declared dependencies.
Extracting these exact definitions lets lightweight CI verify the optional
protocol extension without substituting a copy of its implementation.
"""
import ast
import asyncio
import base64
import json
import os
import re
import types
import urllib.parse
import uuid
from pathlib import Path

import httpx
import pytest
from fastapi import HTTPException, Depends
from pydantic import BaseModel, Field, ValidationError


@pytest.fixture
def protocol():
    source = Path(os.environ.get("GOOGLE_AUTH_SOURCE_UNDER_TEST", str(Path(__file__).parents[1] / "app/routers/auth.py")))
    names = {"OAuthCallbackRequest", "get_google_auth_url", "_profile_from_id_token", "_fetch_google_profile", "google_auth_callback", "GoogleAndroidCallbackRequest", "google_android_config", "google_android_callback"}
    tree = ast.parse(source.read_text(encoding="utf-8"))
    nodes = [node for node in tree.body if getattr(node, "name", None) in names]
    for node in nodes:
        node.decorator_list = []
    ns = dict(BaseModel=BaseModel, Field=Field, HTTPException=HTTPException,
              Depends=Depends, get_db=lambda: None, uuid=uuid, re=re,
              urllib=urllib, httpx=httpx, asyncio=asyncio, base64=base64, json=json,
              settings=types.SimpleNamespace(GOOGLE_CLIENT_ID="test-client",
                  GOOGLE_CLIENT_SECRET="test-secret", GOOGLE_REDIRECT_URI="https://web.example.test/callback", ENVIRONMENT="test"),
              logger=types.SimpleNamespace(debug=lambda *a, **kw: None, warning=lambda *a, **kw: None))
    module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), *nodes], type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(source), "exec"), ns)
    return ns


@pytest.mark.asyncio
async def test_legacy_authorization_shape_and_redirect_stay_unchanged(protocol):
    result = await protocol["get_google_auth_url"]()
    assert set(result) == {"url", "state", "client_id"}
    params = urllib.parse.parse_qs(urllib.parse.urlparse(result["url"]).query)
    assert params["redirect_uri"] == ["https://web.example.test/callback"]
    assert "code_challenge" not in params


@pytest.mark.asyncio
async def test_mobile_authorization_adds_only_s256_and_explicit_capability(protocol):
    result = await protocol["get_google_auth_url"]("https://mobile.example.test/auth/google/callback", "a" * 43, "S256")
    params = urllib.parse.parse_qs(urllib.parse.urlparse(result["url"]).query)
    assert result["pkce_supported"] is True
    assert params["code_challenge"] == ["a" * 43]
    assert params["code_challenge_method"] == ["S256"]
    assert params["redirect_uri"] == ["https://mobile.example.test/auth/google/callback"]


@pytest.mark.parametrize("challenge,method", [("a" * 43, "plain"), (None, "S256"), ("short", "S256"), ("!" * 43, "S256")])
@pytest.mark.asyncio
async def test_invalid_or_downgraded_pkce_rejected(protocol, challenge, method):
    with pytest.raises(HTTPException) as error:
        await protocol["get_google_auth_url"](None, challenge, method)
    assert error.value.status_code == 400


def test_callback_model_is_compatible_and_validates_optional_verifier(protocol):
    model = protocol["OAuthCallbackRequest"]
    assert model(code="legacy-code").code_verifier is None
    assert model(code="code", code_verifier="a" * 43).code_verifier == "a" * 43
    for verifier in ["short", "a" * 129, " " * 43]:
        with pytest.raises(ValidationError):
            model(code="code", code_verifier=verifier)


class Google:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    async def post(self, url, data):
        self.calls.append(data)
        status, body = self.responses.pop(0)
        return httpx.Response(status, json=body)


@pytest.mark.asyncio
async def test_web_exchange_keeps_no_verifier_and_existing_redirect_fallback(protocol):
    fake = Google([(400, {"error": "redirect_uri_mismatch"}), (400, {"error": "invalid_grant"})])
    protocol["_google_client"] = lambda: fake
    assert await protocol["_fetch_google_profile"]("legacy", "https://original.example.test/callback") == {}
    assert len(fake.calls) == 2
    assert all("code_verifier" not in call for call in fake.calls)


@pytest.mark.asyncio
async def test_mobile_exchange_sends_verifier_once_without_redirect_fallback(protocol):
    fake = Google([(400, {"error": "redirect_uri_mismatch"})])
    protocol["_google_client"] = lambda: fake
    assert await protocol["_fetch_google_profile"]("code", "https://original.example.test/callback", "v" * 43) == {}
    assert len(fake.calls) == 1
    assert fake.calls[0]["redirect_uri"] == "https://original.example.test/callback"
    assert fake.calls[0]["code_verifier"] == "v" * 43


@pytest.mark.asyncio
async def test_callback_dispatch_preserves_legacy_arguments(protocol):
    calls = []
    async def process(*args):
        calls.append(args)
        return {"test": True}
    protocol["_process_google_code"] = process
    model = protocol["OAuthCallbackRequest"]
    await protocol["google_auth_callback"](model(code="web"), None)
    await protocol["google_auth_callback"](model(code="mobile", code_verifier="v" * 43), None)
    assert calls[0] == ("web", "https://web.example.test/callback", None)
    assert calls[1] == ("mobile", "https://web.example.test/callback", None, "v" * 43)


@pytest.mark.asyncio
async def test_android_configuration_uses_existing_server_audience(protocol):
    result = await protocol["google_android_config"]()
    assert result == {"server_client_id": "test-client"}
    assert "test-secret" not in str(result)


@pytest.mark.asyncio
async def test_android_config_rejects_missing_server_credentials(protocol):
    protocol["settings"].GOOGLE_CLIENT_SECRET = ""
    with pytest.raises(HTTPException) as failure:
        await protocol["google_android_config"]()
    assert failure.value.status_code == 503


@pytest.mark.asyncio
async def test_native_code_uses_only_empty_redirect_without_browser_fallback(protocol):
    fake = Google([(400, {"error": "redirect_uri_mismatch"})])
    protocol["_google_client"] = lambda: fake
    assert await protocol["_fetch_google_profile"]("native-code", "") == {}
    assert len(fake.calls) == 1
    assert fake.calls[0]["redirect_uri"] == ""
    assert "code_verifier" not in fake.calls[0]


@pytest.mark.asyncio
async def test_android_callback_reuses_existing_account_and_role_processor(protocol):
    calls = []
    async def process(*args):
        calls.append(args)
        return {"status": "session"}
    protocol["_process_google_code"] = process
    payload = protocol["GoogleAndroidCallbackRequest"](code="one-use-native-code")
    assert await protocol["google_android_callback"](payload, None) == {"status": "session"}
    assert calls == [("one-use-native-code", "", None)]
    with pytest.raises(ValidationError):
        protocol["GoogleAndroidCallbackRequest"](code="")
