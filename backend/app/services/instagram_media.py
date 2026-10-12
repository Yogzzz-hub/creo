"""Conservative publishing-only preflight; existing upload rules are unchanged."""

from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.services import storage_service
from app.services.instagram_client import InstagramError


def validate_metadata(meta: dict, media_type: str, size: int) -> None:
    streams = meta.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    width, height = video.get("width", 0), video.get("height", 0)
    if not width or not height:
        raise InstagramError("Media dimensions could not be verified.", "INVALID_MEDIA")
    ratio = width / height
    image = video.get("codec_name") == "mjpeg"
    if image:
        if meta.get("format", {}).get("format_name") not in ("image2", "jpeg_pipe"):
            raise InstagramError(
                "Images must be standalone JPEG files, not MJPEG video.", "INVALID_MEDIA"
            )
        if media_type == "REELS" or size > 8 * 1024 * 1024 or not 320 <= width <= 1440:
            raise InstagramError(
                "Use a JPEG image up to 8 MB and 320–1440 pixels wide, or upload a "
                "video for a Reel.",
                "INVALID_MEDIA",
            )
        if not 0.8 <= ratio <= 1.91 and media_type != "STORIES":
            raise InstagramError(
                "Feed image aspect ratio must be between 4:5 and 1.91:1.", "INVALID_MEDIA"
            )
    else:
        if media_type == "IMAGE" or video.get("codec_name") not in ("h264", "hevc"):
            raise InstagramError(
                "Publish JPEG images or H.264/HEVC MP4/MOV videos.", "INVALID_MEDIA"
            )
        if not set(meta.get("format", {}).get("format_name", "").split(",")).intersection(
            {"mov", "mp4"}
        ):
            raise InstagramError("Video must use an MP4 or MOV container.", "INVALID_MEDIA")
        try:
            duration = float(meta.get("format", {}).get("duration", 0))
            n, den = video.get("avg_frame_rate", "0/1").split("/")
            fps = float(n) / float(den)
        except (ValueError, ZeroDivisionError):
            raise InstagramError(
                "Video duration/frame rate could not be verified.", "INVALID_MEDIA"
            ) from None
        max_seconds = 60 if media_type == "STORIES" else 900
        max_bytes = (100 if media_type == "STORIES" else 1000) * 1024 * 1024
        if (
            not 3 <= duration <= max_seconds
            or not 23 <= fps <= 60
            or width > 1920
            or size > max_bytes
        ):
            raise InstagramError(
                f"Video must be 3–{max_seconds} seconds, 23–60 fps, at most 1920 "
                "pixels wide and within the publishing size limit.",
                "INVALID_MEDIA",
            )
        if video.get("pix_fmt") not in ("yuv420p", "yuvj420p") or video.get(
            "field_order", "progressive"
        ) not in ("progressive", "unknown"):
            raise InstagramError("Export progressive 4:2:0 video for Instagram.", "INVALID_MEDIA")
        if int(video.get("bit_rate") or meta.get("format", {}).get("bit_rate") or 0) > 25_000_000:
            raise InstagramError("Video bitrate must be at most 25 Mbps.", "INVALID_MEDIA")
        for audio in (s for s in streams if s.get("codec_type") == "audio"):
            if (
                audio.get("codec_name") != "aac"
                or int(audio.get("sample_rate", 0)) > 48000
                or audio.get("channels", 0) not in (1, 2)
            ):
                raise InstagramError("Use AAC audio, mono/stereo, at most 48 kHz.", "INVALID_MEDIA")
    if media_type == "STORIES" and abs(ratio - 9 / 16) > 0.03:
        raise InstagramError("Export Stories in a vertical 9:16 aspect ratio.", "INVALID_MEDIA")


async def inspect_media(raw: str, media_type: str) -> tuple[str, dict]:
    if raw.startswith(("/", "http://")):
        raise InstagramError(
            "Upload this asset to Creo's private cloud storage before publishing.",
            "MEDIA_NOT_ACCESSIBLE",
        )
    try:
        if raw.startswith("https://"):
            url = raw
            allowed = {
                urlparse(v).hostname
                for v in (settings.STORAGE_ENDPOINT_URL, settings.SUPABASE_URL)
                if v
            }
            allowed.add(f"{settings.STORAGE_BUCKET}.s3.amazonaws.com")
            if urlparse(url).hostname not in allowed:
                raise InstagramError(
                    "This media URL is not in Creo's configured storage.", "UNTRUSTED_MEDIA"
                )
        else:
            url = await asyncio.to_thread(storage_service.signed_get, raw, ttl=3600)
    except storage_service.StorageError:
        raise InstagramError(
            "The media could not be accessed in storage.", "MEDIA_NOT_ACCESSIBLE"
        ) from None
    if urlparse(url).scheme != "https" or "presigned=mock" in url:
        raise InstagramError(
            "Real HTTPS cloud storage is required for publishing.", "MEDIA_NOT_ACCESSIBLE"
        )
    digest, size = hashlib.sha256(), 0
    with tempfile.TemporaryDirectory(prefix="creo-publish-") as directory:
        file = Path(directory) / "asset"
        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=False) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        raise InstagramError(
                            "The media URL could not be retrieved.", "MEDIA_NOT_ACCESSIBLE"
                        )
                    with file.open("wb") as output:
                        async for chunk in response.aiter_bytes():
                            size += len(chunk)
                            if size > 1024 * 1024 * 1024:
                                raise InstagramError(
                                    "This file exceeds Instagram's publishing size limit.",
                                    "INVALID_MEDIA",
                                )
                            digest.update(chunk)
                            output.write(chunk)
            process = await asyncio.create_subprocess_exec(
                settings.INSTAGRAM_FFPROBE_PATH,
                "-v",
                "error",
                "-protocol_whitelist",
                "file,pipe",
                "-show_streams",
                "-show_format",
                "-of",
                "json",
                str(file),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, _ = await asyncio.wait_for(process.communicate(), timeout=30)
            except TimeoutError:
                process.kill()
                await process.communicate()
                raise InstagramError(
                    "Media inspection timed out. Check the file.", "INVALID_MEDIA"
                ) from None
            if process.returncode:
                raise InstagramError(
                    "This file could not be decoded. Export a compatible JPEG or MP4.",
                    "INVALID_MEDIA",
                )
            meta = json.loads(stdout)
        except FileNotFoundError:
            raise InstagramError(
                "Media verification is unavailable. Administrator must install ffprobe.",
                "MEDIA_VALIDATOR_UNAVAILABLE",
            ) from None
        except (httpx.HTTPError, ValueError):
            raise InstagramError(
                "Media could not be verified. Check storage and file format.",
                "MEDIA_NOT_ACCESSIBLE",
                retryable=True,
            ) from None
    validate_metadata(meta, media_type, size)
    return url, {
        "sha256": digest.hexdigest(),
        "size": size,
        "is_video": next(s for s in meta["streams"] if s.get("codec_type") == "video").get(
            "codec_name"
        )
        != "mjpeg",
    }
