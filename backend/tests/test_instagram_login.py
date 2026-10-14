"""Offline contracts for direct Instagram Login and provider separation."""

import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import httpx
from cryptography.fernet import Fernet

from app.config import settings
from app.services import instagram_connection as connection
from app.services.instagram_client import InstagramError, RealInstagramClient
from app.services.instagram_login import LOGIN_SCOPES, DirectInstagramClient, client_for_provider


class DirectLoginTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.calls = []
        self.account_id = "12345"
        self.account_type = "BUSINESS"
        self.scopes = LOGIN_SCOPES.copy()
        self.wrapped = False
        self.expiry = 5184000
        self.patches = [
            patch.object(settings, "INSTAGRAM_LOGIN_APP_ID", "1055855437409043"),
            patch.object(settings, "INSTAGRAM_LOGIN_APP_SECRET", "direct-secret"),
        ]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)
        self.client = DirectInstagramClient(httpx.MockTransport(self.handle))

    def handle(self, request):
        self.calls.append(request)
        self.assertNotEqual(request.url.host, "graph.facebook.com")
        self.assertNotIn("appsecret_proof", request.url.params)
        path = request.url.path
        if request.url.host == "api.instagram.com":
            self.assertEqual(path, "/oauth/access_token")
            body = parse_qs(request.content.decode())
            self.assertEqual(body["client_id"], ["1055855437409043"])
            self.assertEqual(body["client_secret"], ["direct-secret"])
            self.assertEqual(body["grant_type"], ["authorization_code"])
            result = {"access_token": "short-token", "user_id": "12345"}
            return httpx.Response(200, json={"data": [result]} if self.wrapped else result)
        if path == "/access_token":
            self.assertEqual(request.url.params["grant_type"], "ig_exchange_token")
            self.assertEqual(request.url.params["client_secret"], "direct-secret")
            return httpx.Response(
                200, json={"access_token": "long-token", "expires_in": self.expiry}
            )
        self.assertEqual(request.headers["Authorization"], "Bearer long-token")
        if path.endswith("/me/permissions"):
            result = {"data": [{"permission": scope, "status": "granted"} for scope in self.scopes]}
        elif path.endswith("/me"):
            result = {
                "user_id": self.account_id,
                "username": "test_brand",
                "account_type": self.account_type,
            }
        elif path.endswith("/content_publishing_limit"):
            result = {"data": [{"quota_usage": 0, "config": {"quota_total": 100}}]}
        elif path.endswith("/media_publish"):
            result = {"id": "published-id"}
        else:
            raise AssertionError("Unexpected endpoint: " + str(request.url))
        return httpx.Response(200, json=result)

    async def test_connect_verify_publish_and_revoke_without_facebook_page(self):
        for wrapped in (False, True):
            self.wrapped = wrapped
            account = (await self.client.discover_accounts("code"))[0]
            self.assertEqual(account["provider"], "instagram")
            self.assertEqual(account["page_id"], "")
            self.assertEqual(account["id"], "12345")
            credentials = {"user_token": account["user_token"], "page_token": account["page_token"]}
            await self.client.verify_account("12345", "", credentials)
            result = await self.client.publish_container(
                "12345", "container", credentials["page_token"]
            )
            self.assertEqual(result["media_id"], "published-id")
            await self.client.revoke(credentials)
        self.assertFalse(any("/accounts" in str(r.url) for r in self.calls))

    async def test_missing_publish_permission_is_rejected(self):
        self.scopes.remove("instagram_business_content_publish")
        with self.assertRaises(InstagramError) as caught:
            await self.client.discover_accounts("code")
        self.assertEqual(caught.exception.code, "MISSING_PERMISSIONS")

    async def test_personal_account_is_rejected(self):
        self.account_type = "PERSONAL"
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")

    async def test_account_mismatch_is_rejected(self):
        self.account_id = "99999"
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")
        with self.assertRaises(InstagramError) as caught:
            await self.client.verify_account("12345", "", {"user_token": "long-token"})
        self.assertEqual(caught.exception.code, "ACCOUNT_CHANGED")

    async def test_invalid_token_expiry_is_rejected(self):
        self.expiry = 0
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")

    def test_direct_dialog_uses_instagram_app_and_scopes(self):
        url = urlparse(connection.authorization_url("ig:random-state", "instagram"))
        query = parse_qs(url.query)
        self.assertEqual(url.hostname, "www.instagram.com")
        self.assertEqual(query["client_id"], ["1055855437409043"])
        self.assertEqual(set(query["scope"][0].split(",")), LOGIN_SCOPES)
        self.assertEqual(query["state"], ["ig:random-state"])
        self.assertNotIn("client_secret", query)
        self.assertNotIn("config_id", query)

    def test_direct_configuration_does_not_require_facebook_credentials(self):
        with (
            patch.object(settings, "INSTAGRAM_APP_ID", ""),
            patch.object(settings, "INSTAGRAM_APP_SECRET", ""),
            patch.object(settings, "ENCRYPTION_KEY", Fernet.generate_key().decode()),
        ):
            self.assertTrue(connection.configured("instagram"))
            self.assertFalse(connection.configured())
            with patch.object(settings, "INSTAGRAM_LOGIN_APP_SECRET", ""):
                self.assertFalse(connection.configured("instagram"))

    def test_provider_factory_preserves_facebook_default(self):
        self.assertIs(type(client_for_provider()), RealInstagramClient)
        self.assertIsInstance(client_for_provider("instagram"), DirectInstagramClient)
        with self.assertRaises(InstagramError):
            client_for_provider("unknown")
