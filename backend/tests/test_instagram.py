"""Offline safeguards and provider contract tests; never contact Meta."""

import json
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from cryptography.fernet import Fernet

from app.config import settings
from app.core.errors import Conflict
from app.models.enums import DeliverableStatus
from app.services import instagram_connection as connection
from app.services import publishing_service as service
from app.services.instagram_client import SCOPES, InstagramError, RealInstagramClient
from app.services.instagram_media import validate_metadata


class ApprovalAndTimeTests(unittest.TestCase):
    def setUp(self):
        self.d = SimpleNamespace(
            id=uuid.uuid4(),
            client_id=uuid.uuid4(),
            version=1,
            file_url="client/version.jpg",
            file_type="image/jpeg",
            file_size_bytes=100,
            status=DeliverableStatus.APPROVED,
            approved_at=datetime.now(UTC),
        )
        self.job = SimpleNamespace(
            caption="Approved caption",
            media_type="IMAGE",
            media_metadata={"sha256": "a" * 64},
            approved_by=self.d.client_id,
            scheduled_at=datetime.now(UTC) + timedelta(days=1),
        )
        self.job.approved_fingerprint = service.fingerprint(
            self.d, self.job.caption, self.job.media_type, self.job.media_metadata
        )

    def test_approval_binds_version_caption_and_bytes(self):
        self.assertTrue(service.approved(self.job, self.d))
        for obj, key, value in [
            (self.d, "version", 2),
            (self.job, "caption", "Changed"),
            (self.job, "media_metadata", {"sha256": "b" * 64}),
            (self.job, "approved_by", uuid.uuid4()),
            (self.d, "status", DeliverableStatus.REVISION_REQUESTED),
        ]:
            original = getattr(obj, key)
            setattr(obj, key, value)
            self.assertFalse(service.approved(self.job, self.d), key)
            setattr(obj, key, original)

    def test_approval_requires_media_preflight(self):
        self.job.media_metadata = None
        self.assertFalse(service.approved(self.job, self.d))

    def test_approval_never_bypasses_schedule_or_connection(self):
        profile = SimpleNamespace(
            ig_connection_status="connected",
            ig_token_encrypted=b"x",
            ig_connection_id=uuid.uuid4(),
            instagram_user_id="account-a",
        )
        service.set_ready(self.job, self.d, profile)
        self.assertEqual(self.job.status, "scheduled")
        self.assertEqual(self.job.instagram_account_id, "account-a")
        self.job.scheduled_at = datetime.now(UTC) - timedelta(seconds=1)
        service.set_ready(self.job, self.d, profile)
        self.assertEqual(self.job.status, "needs_schedule")
        self.job.scheduled_at = datetime.now(UTC) + timedelta(days=1)
        profile.ig_connection_status = "disconnected"
        service.set_ready(self.job, self.d, profile)
        self.assertEqual(self.job.status, "paused")
        self.job.approved_by = None
        service.set_ready(self.job, self.d, profile)
        self.assertEqual(self.job.status, "pending_approval")

    def test_iana_timezone_conversion(self):
        self.assertEqual(
            service.utc_schedule("2099-10-20T18:30", "Asia/Kolkata"),
            datetime(2099, 10, 20, 13, 0, tzinfo=UTC),
        )

    def test_dst_gap_and_ambiguity(self):
        with self.assertRaises(Conflict):
            service.utc_schedule("2099-03-08T02:30", "America/New_York")
        with self.assertRaises(Conflict):
            service.utc_schedule("2099-11-01T01:30", "America/New_York")
        early = service.utc_schedule("2099-11-01T01:30", "America/New_York", 0)
        late = service.utc_schedule("2099-11-01T01:30", "America/New_York", 1)
        self.assertEqual(late - early, timedelta(hours=1))

    def test_invalid_and_past_schedules(self):
        for value, zone in [
            ("2000-01-01T12:00", "UTC"),
            ("bad", "UTC"),
            ("2099-01-01T12:00+03:00", "UTC"),
            ("2099-01-01T12:00", "Invalid/Zone"),
        ]:
            with self.assertRaises(Conflict):
                service.utc_schedule(value, zone)

    def test_encryption_and_safe_status(self):
        with patch.object(settings, "ENCRYPTION_KEY", Fernet.generate_key().decode()):
            sealed = connection.seal({"page_token": "private-value"})
            self.assertNotIn(b"private-value", sealed)
            self.assertEqual(connection.unseal(sealed), {"page_token": "private-value"})
            with self.assertRaises(InstagramError):
                connection.unseal(b"tampered")
        profile = SimpleNamespace(
            ig_metadata={"page_token": "secret", "username": "business"},
            ig_connection_status="connected",
            ig_connection_id=uuid.uuid4(),
            instagram_user_id="ig",
            ig_token_expires_at=None,
            timezone="UTC",
        )
        self.assertNotIn("secret", json.dumps(connection.public_status(profile)))


class MediaTests(unittest.TestCase):
    def image(self, width=1080, height=1080, codec="mjpeg", format_name="jpeg_pipe"):
        return {
            "streams": [
                {"codec_type": "video", "codec_name": codec, "width": width, "height": height}
            ],
            "format": {"format_name": format_name},
        }

    def video(self, duration=30):
        return {
            "streams": [
                {
                    "codec_type": "video",
                    "codec_name": "h264",
                    "width": 1080,
                    "height": 1920,
                    "avg_frame_rate": "30/1",
                    "pix_fmt": "yuv420p",
                    "field_order": "progressive",
                },
                {"codec_type": "audio", "codec_name": "aac", "sample_rate": "48000", "channels": 2},
            ],
            "format": {"format_name": "mov,mp4,m4a,3gp,3g2,mj2", "duration": str(duration)},
        }

    def test_supported_media(self):
        validate_metadata(self.image(), "IMAGE", 1000)
        validate_metadata(self.image(1080, 1920), "STORIES", 1000)
        validate_metadata(self.video(), "REELS", 1000)
        validate_metadata(self.video(), "STORIES", 1000)

    def test_reject_incompatible_exports(self):
        for meta, kind, size in [
            (self.image(codec="png"), "IMAGE", 1000),
            (self.image(format_name="avi"), "IMAGE", 1000),
            (self.image(), "IMAGE", 9 * 1024 * 1024),
            (self.image(), "STORIES", 1000),
            (self.video(61), "STORIES", 1000),
            (self.video(901), "REELS", 1000),
            (self.image(), "REELS", 1000),
        ]:
            with self.assertRaises(InstagramError):
                validate_metadata(meta, kind, size)


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_publish_timeout_is_ambiguous_and_sanitized(self):
        def timeout(request):
            raise httpx.ReadTimeout("secret-token in request", request=request)

        client = RealInstagramClient(httpx.MockTransport(timeout))
        with self.assertRaises(InstagramError) as caught:
            await client.publish_container("ig", "container", "secret-token")
        self.assertTrue(caught.exception.ambiguous)
        self.assertFalse(caught.exception.retryable)
        self.assertNotIn("secret-token", str(caught.exception))

    async def test_rate_limit_and_revocation_classification(self):
        for code, status, expected in [(4, 429, "retryable"), (190, 400, "reconnect")]:
            client = RealInstagramClient(
                httpx.MockTransport(
                    lambda request, status=status, code=code: httpx.Response(
                        status, json={"error": {"code": code, "message": "secret"}}
                    )
                )
            )
            with self.assertRaises(InstagramError) as caught:
                await client.get_container_status("container", "token")
            self.assertTrue(getattr(caught.exception, expected))
            self.assertNotIn("secret", str(caught.exception))

    async def test_publish_requires_provider_id(self):
        client = RealInstagramClient(httpx.MockTransport(lambda r: httpx.Response(200, json={})))
        with self.assertRaises(InstagramError) as caught:
            await client.publish_container("ig", "container", "token")
        self.assertTrue(caught.exception.ambiguous)

    async def test_video_story_uses_explicit_type_not_extension(self):
        requests = []

        def handle(request):
            requests.append(request)
            return httpx.Response(200, json={"id": "container"})

        client = RealInstagramClient(httpx.MockTransport(handle))
        result = await client.create_media_container(
            "ig",
            "STORIES",
            "https://storage/opaque",
            "no story caption",
            access_token="private-token",
            is_video=True,
        )
        self.assertEqual(result, "container")
        self.assertIn(b"video_url=", requests[0].content)
        self.assertNotIn(b"caption=", requests[0].content)
        self.assertNotIn("private-token", str(requests[0].url))

    async def test_discovery_paginates_multiple_business_pages(self):
        calls = []

        def handle(request):
            path = request.url.path
            calls.append(path)
            if path.endswith("oauth/access_token"):
                body = {"access_token": "user-token"}
            elif path.endswith("debug_token"):
                body = {"data": {"is_valid": True, "app_id": "test-app", "user_id": "fb-user"}}
            elif path.endswith("me/permissions"):
                body = {"data": [{"permission": p, "status": "granted"} for p in SCOPES]}
            elif path.endswith("me/accounts"):
                second = request.url.params.get("after") == "next-cursor"
                suffix = "2" if second else "1"
                body = {
                    "data": [
                        {
                            "id": "page" + suffix,
                            "name": "Page " + suffix,
                            "access_token": "page-token",
                            "tasks": ["CREATE_CONTENT"],
                            "instagram_business_account": {"id": "ig" + suffix},
                        }
                    ]
                }
                if not second:
                    body["paging"] = {
                        "next": "https://untrusted.invalid/ignored",
                        "cursors": {"after": "next-cursor"},
                    }
            elif path.endswith("content_publishing_limit"):
                body = {"data": [{"quota_usage": 0, "config": {"quota_total": 100}}]}
            else:
                self.assertNotIn("account_type", request.url.params.get("fields", ""))
                body = {"username": "restaurant"}
            return httpx.Response(200, json=body)

        with patch.object(settings, "INSTAGRAM_APP_ID", "test-app"):
            accounts = await RealInstagramClient(httpx.MockTransport(handle)).discover_accounts(
                "code"
            )
        self.assertEqual([a["id"] for a in accounts], ["ig1", "ig2"])
        self.assertEqual(accounts[0]["account_type"], "PAGE_LINKED_PROFESSIONAL")
        self.assertEqual(sum(p.endswith("me/accounts") for p in calls), 2)

    async def test_expired_data_access_cannot_verify(self):
        client = RealInstagramClient(
            httpx.MockTransport(
                lambda r: httpx.Response(
                    200,
                    json={
                        "data": {
                            "is_valid": True,
                            "app_id": "test-app",
                            "data_access_expires_at": 1,
                        }
                    },
                )
            )
        )
        with patch.object(settings, "INSTAGRAM_APP_ID", "test-app"):
            with self.assertRaises(InstagramError):
                await client.debug_token("token")


if __name__ == "__main__":
    unittest.main()
