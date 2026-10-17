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
        self.app_scoped_id = "12345"
        self.account_type = "BUSINESS"
        self.scopes = LOGIN_SCOPES.copy()
        self.wrapped = False
        self.expiry = 5184000
        self.permission_format = "string"
        self.quota_error = False
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
            if self.permission_format == "string":
                result["permissions"] = ",".join(sorted(self.scopes))
            elif self.permission_format == "list":
                result["permissions"] = sorted(self.scopes)
            return httpx.Response(200, json={"data": [result]} if self.wrapped else result)
        if path == "/access_token":
            self.assertEqual(request.url.params["grant_type"], "ig_exchange_token")
            self.assertEqual(request.url.params["client_secret"], "direct-secret")
            return httpx.Response(
                200, json={"access_token": "long-token", "expires_in": self.expiry}
            )
        self.assertEqual(request.headers["Authorization"], "Bearer long-token")
        if path.endswith("/12345/permissions"):
            if request.method == "GET":
                # Reproduce the production rejection; connection must not use this edge.
                return httpx.Response(400, json={"error": {"code": 100}})
            self.assertEqual(request.method, "DELETE")
            result = {"success": True}
        elif path.endswith("/me"):
            result = {
                "id": self.app_scoped_id,
                "user_id": self.account_id,
                "username": "test_brand",
                "account_type": self.account_type,
            }
        elif path.endswith("/content_publishing_limit"):
            if self.quota_error:
                return httpx.Response(403, json={"error": {"code": 10}})
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

    async def test_list_grants_are_accepted_without_reading_permissions_edge(self):
        self.permission_format = "list"
        account = (await self.client.discover_accounts("code"))[0]
        self.assertEqual(set(account["scopes"]), LOGIN_SCOPES)
        self.assertFalse(any(r.url.path.endswith("/permissions") for r in self.calls))

    async def test_missing_exchange_grants_fail_closed(self):
        self.permission_format = "missing"
        with self.assertRaises(InstagramError) as caught:
            await self.client.discover_accounts("code")
        self.assertEqual(caught.exception.code, "INSTAGRAM_PERMISSION_CHECK_FAILED")

    async def test_live_publishing_access_denied_is_rejected(self):
        self.quota_error = True
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")
        with self.assertRaises(InstagramError):
            await self.client.verify_account("12345", "", {"user_token": "long-token"})

    async def test_personal_account_is_rejected(self):
        self.account_type = "PERSONAL"
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")

    async def test_account_mismatch_is_rejected(self):
        self.account_id = "99999"
        self.app_scoped_id = "88888"
        with self.assertRaises(InstagramError):
            await self.client.discover_accounts("code")
        with self.assertRaises(InstagramError) as caught:
            await self.client.verify_account("12345", "", {"user_token": "long-token"})
        self.assertEqual(caught.exception.code, "ACCOUNT_CHANGED")

    async def test_oauth_app_scoped_id_resolves_to_professional_publishing_id(self):
        self.account_id = "17841400000123456"
        account = (await self.client.discover_accounts("code"))[0]
        self.assertEqual(account["id"], self.account_id)
        await self.client.verify_account(
            self.account_id, "", {"user_token": account["user_token"]}
        )
        quota_calls = [r for r in self.calls if r.url.path.endswith("/content_publishing_limit")]
        self.assertTrue(all(f"/{self.account_id}/" in r.url.path for r in quota_calls))

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
        self.assertNotIn("force_reauth", query)
        self.assertEqual(query["enable_fb_login"], ["false"])
        self.assertEqual(url.path, "/oauth/authorize/")
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
