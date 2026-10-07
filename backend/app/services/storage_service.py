"""Storage service — S3-compatible file operations.

All file operations use pre-signed URLs — the bucket is NEVER public.
Supports AWS S3 and S3-compatible endpoints (Supabase Storage, MinIO, Cloudflare R2).

Key guarantees:
- upload_intent validates MIME type against allowlist before generating PUT URL
- confirm HEAD-checks the object before marking it usable
- signed_get generates short-lived read URLs per-request
- storage_key namespacing: clients/{client_id}/{yyyy}/{mm}/{uuid}.{ext}
- resolve_media_url turns any stored file_url into something a browser on
  another origin can load (signed URL or absolute API URL), never a bare key
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import IO, Any, Literal

import structlog

from app.config import settings

log = structlog.get_logger(__name__)

# ── Allowed MIME types ────────────────────────────────────────────────────────
ALLOWED_MIMES: dict[str, str] = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}

# App Flow 6.4: 10 MB for images, 500 MB for videos.
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024
MAX_FILE_SIZE_BYTES = MAX_VIDEO_SIZE_BYTES

LOCAL_UPLOAD_PREFIXES = ("/static/", "/uploads/")
_LOCAL_STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))


def max_size_for(mime_type: str) -> int:
    return MAX_VIDEO_SIZE_BYTES if mime_type.startswith("video/") else MAX_IMAGE_SIZE_BYTES


class StorageError(Exception):
    """Base exception for storage operations."""

    def __init__(self, message: str, code: str = "STORAGE_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class UnsupportedMimeType(StorageError):
    """Raised when the requested MIME type is not in the allowlist."""

    def __init__(self, mime_type: str) -> None:
        allowed = list(ALLOWED_MIMES.keys())
        super().__init__(
            f"MIME type '{mime_type}' is not supported. Allowed: {allowed}",
            code="UNSUPPORTED_MIME_TYPE",
        )


class FileTooLarge(StorageError):
    """Raised when the declared file size exceeds the limit for its media kind."""

    def __init__(self, size_bytes: int, limit_bytes: int = MAX_FILE_SIZE_BYTES) -> None:
        max_mb = limit_bytes // (1024 * 1024)
        super().__init__(
            f"File exceeds maximum size ({max_mb}MB for this file type); got {size_bytes} bytes",
            code="FILE_TOO_LARGE",
        )


def validate_media(mime_type: str, file_size_bytes: int) -> None:
    """Reject unsupported types and oversized or empty files before any storage call."""
    if mime_type not in ALLOWED_MIMES:
        raise UnsupportedMimeType(mime_type)
    limit = max_size_for(mime_type)
    if file_size_bytes <= 0 or file_size_bytes > limit:
        raise FileTooLarge(file_size_bytes, limit)


class ObjectNotFound(StorageError):
    """Raised when an object cannot be found in storage during confirmation."""

    def __init__(self, storage_key: str) -> None:
        super().__init__(
            f"Object not found in storage: {storage_key}",
            code="OBJECT_NOT_FOUND",
        )


class ContentLengthMismatch(StorageError):
    """Raised when actual HEAD Content-Length does not match declared size."""

    def __init__(self, declared: int, actual: int) -> None:
        super().__init__(
            f"Content-Length mismatch: declared {declared} bytes, actual {actual} bytes",
            code="CONTENT_LENGTH_MISMATCH",
        )


def make_storage_key(client_id: uuid.UUID, mime_type: str) -> str:
    """Generate namespaced storage key: clients/{client_id}/{yyyy}/{mm}/{uuid}.{ext}"""
    now = datetime.now(UTC)
    ext = ALLOWED_MIMES[mime_type]
    file_uuid = uuid.uuid4()
    return f"clients/{client_id}/{now.year}/{now.month:02d}/{file_uuid}.{ext}"


def _is_s3_configured() -> bool:
    return bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)


def _is_supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def supports_direct_upload() -> bool:
    """True when a remote bucket can accept browser PUTs via pre-signed URLs."""
    return _is_s3_configured() or _is_supabase_configured()


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }


def _get_s3_client() -> Any:
    """Lazily create a boto3 S3 client (avoids import cost at module level)."""
    try:
        import importlib

        boto3: Any = importlib.import_module("boto3")

        kwargs: dict[str, Any] = {
            "region_name": settings.STORAGE_REGION or "auto",
        }
        if settings.AWS_ACCESS_KEY_ID:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        if settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        if settings.STORAGE_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.STORAGE_ENDPOINT_URL

        return boto3.client("s3", **kwargs)
    except (ImportError, ModuleNotFoundError) as exc:
        raise StorageError(
            "boto3 is not installed. Add it to pyproject.toml dependencies.",
            code="BOTO3_MISSING",
        ) from exc


def upload_intent(
    client_id: uuid.UUID,
    mime_type: str,
    file_size_bytes: int,
) -> dict[str, object]:
    """Validate upload parameters and return a pre-signed PUT URL.

    Supports Cloudflare R2, AWS S3, and Supabase Storage.
    """
    validate_media(mime_type, file_size_bytes)

    storage_key = make_storage_key(client_id, mime_type)
    ttl = settings.PRESIGNED_URL_TTL  # 15 min by default

    # 1. Prioritize Cloudflare R2 / S3 if credentials configured
    if _is_s3_configured():
        try:
            s3 = _get_s3_client()
            upload_url = s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.STORAGE_BUCKET,
                    "Key": storage_key,
                    "ContentType": mime_type,
                    "ContentLength": file_size_bytes,
                },
                ExpiresIn=ttl,
            )
            log.info(
                "r2_upload_intent_created",
                client_id=str(client_id),
                storage_key=storage_key,
                mime_type=mime_type,
                file_size_bytes=file_size_bytes,
            )
            return {
                "storage_key": storage_key,
                "upload_url": upload_url,
                "expires_in": ttl,
                "mime_type": mime_type,
                "file_size_bytes": file_size_bytes,
            }
        except Exception as exc:
            log.error("r2_presign_failed", error=str(exc), client_id=str(client_id))
            if not _is_supabase_configured():
                raise StorageError(f"Failed to generate upload URL: {exc}") from exc

    # 2. Supabase Storage REST API fallback
    if _is_supabase_configured():
        import httpx

        sign_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/upload/sign/"
            f"{settings.STORAGE_BUCKET}/{storage_key}"
        )
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(sign_url, headers=_supabase_headers())
                if resp.status_code in (200, 201):
                    data = resp.json()
                    upload_path = data.get("url", "")
                    upload_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{upload_path}"
                    log.info(
                        "supabase_upload_intent_created",
                        client_id=str(client_id),
                        storage_key=storage_key,
                        mime_type=mime_type,
                    )
                    return {
                        "storage_key": storage_key,
                        "upload_url": upload_url,
                        "expires_in": ttl,
                        "mime_type": mime_type,
                        "file_size_bytes": file_size_bytes,
                    }
                log.warning(
                    "supabase_upload_intent_bad_status",
                    status=resp.status_code,
                    body=resp.text,
                )
        except Exception as exc:
            log.warning("supabase_upload_intent_error", error=str(exc))

    try:
        s3 = _get_s3_client()
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.STORAGE_BUCKET,
                "Key": storage_key,
                "ContentType": mime_type,
                "ContentLength": file_size_bytes,
            },
            ExpiresIn=ttl,
        )
    except StorageError:
        raise
    except Exception as exc:
        log.error("storage_presign_failed", error=str(exc), client_id=str(client_id))
        if settings.ENVIRONMENT in ("development", "test"):
            upload_url = (
                f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}"
                f"?presigned=mock&expires={ttl}"
            )
        else:
            raise StorageError(f"Failed to generate upload URL: {exc}") from exc

    log.info(
        "upload_intent_created",
        client_id=str(client_id),
        storage_key=storage_key,
        mime_type=mime_type,
        file_size_bytes=file_size_bytes,
    )
    return {
        "storage_key": storage_key,
        "upload_url": upload_url,
        "expires_in": ttl,
        "mime_type": mime_type,
        "file_size_bytes": file_size_bytes,
    }


def confirm_upload(storage_key: str, declared_size_bytes: int) -> dict[str, object]:
    """Verify object exists in storage.

    Prioritizes Cloudflare R2 / S3 when configured, falling back to Supabase Storage.
    """
    # 1. Prioritize Cloudflare R2 / S3 if credentials configured
    if _is_s3_configured():
        try:
            s3 = _get_s3_client()
            head = s3.head_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
            actual_size = head.get("ContentLength", 0)
            if actual_size != declared_size_bytes:
                raise ContentLengthMismatch(declared=declared_size_bytes, actual=actual_size)
            log.info("r2_upload_confirmed", storage_key=storage_key, size_bytes=actual_size)
            return {"storage_key": storage_key, "confirmed": True, "actual_size": actual_size}
        except ContentLengthMismatch:
            raise
        except StorageError:
            raise
        except Exception as exc:
            error_str = str(exc)
            if "404" in error_str or "NoSuchKey" in error_str or "Not Found" in error_str:
                raise ObjectNotFound(storage_key) from exc
            log.warning("r2_confirm_failed", error=str(exc))
            if not _is_supabase_configured():
                if settings.ENVIRONMENT in ("development", "test"):
                    return {
                        "storage_key": storage_key,
                        "confirmed": True,
                        "actual_size": declared_size_bytes,
                    }
                raise StorageError(f"HEAD request failed: {exc}") from exc

    # 2. Supabase Storage fallback
    if _is_supabase_configured():
        import httpx

        # Verify object existence via signed URL probe
        sign_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/"
            f"{settings.STORAGE_BUCKET}/{storage_key}"
        )
        headers = {**_supabase_headers(), "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(sign_url, headers=headers, json={"expiresIn": 60})
                if resp.status_code == 200:
                    log.info("supabase_upload_confirmed", storage_key=storage_key)
                    return {
                        "storage_key": storage_key,
                        "confirmed": True,
                        "actual_size": declared_size_bytes,
                    }
                elif resp.status_code in (400, 404):
                    data: dict[str, Any] = resp.json() if resp.text else {}
                    if data.get("code") in ("NoSuchKey", "not_found") or "not found" in resp.text.lower():
                        raise ObjectNotFound(storage_key)
        except ObjectNotFound:
            raise
        except Exception as exc:
            log.warning("supabase_confirm_fallback", error=str(exc))

    if settings.ENVIRONMENT in ("development", "test"):
        return {
            "storage_key": storage_key,
            "confirmed": True,
            "actual_size": declared_size_bytes,
        }
    raise StorageError(f"No storage provider configured for confirmation of {storage_key}")


def _attachment_header(filename: str) -> str:
    safe = "".join(ch for ch in filename if ch.isalnum() or ch in "._- ") or "creo-asset"
    return f'attachment; filename="{safe}"'


def signed_get(
    storage_key: str,
    ttl: int = 900,
    expires_in: int | None = None,
    download_filename: str | None = None,
) -> str:
    """Generate a short-lived pre-signed GET URL for the object.

    The bucket is NEVER public. Every read request must use a fresh signed URL.
    Prioritizes Cloudflare R2 / S3 when configured, falling back to Supabase Storage.
    A download_filename makes the browser save the file instead of rendering it.
    """
    effective_ttl = expires_in if expires_in is not None else ttl

    # 1. Prioritize Cloudflare R2 / S3 if credentials configured
    if _is_s3_configured():
        try:
            s3 = _get_s3_client()
            params: dict[str, str] = {"Bucket": settings.STORAGE_BUCKET, "Key": storage_key}
            if download_filename:
                params["ResponseContentDisposition"] = _attachment_header(download_filename)
            url: str = s3.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=effective_ttl,
            )
            return url
        except StorageError:
            raise
        except Exception as exc:
            log.warning("r2_signed_get_failed", error=str(exc))
            if not _is_supabase_configured():
                if settings.ENVIRONMENT in ("development", "test"):
                    return f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"
                raise StorageError(f"Failed to generate signed GET URL: {exc}") from exc

    # 2. Supabase Storage fallback
    if _is_supabase_configured():
        import httpx
        from urllib.parse import quote

        sign_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/"
            f"{settings.STORAGE_BUCKET}/{storage_key}"
        )
        headers = {**_supabase_headers(), "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(sign_url, headers=headers, json={"expiresIn": effective_ttl})
                if resp.status_code in (200, 201):
                    signed_path = resp.json().get("signedURL", "")
                    signed = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_path}"
                    if download_filename:
                        sep = "&" if "?" in signed else "?"
                        signed = f"{signed}{sep}download={quote(download_filename)}"
                    return signed
                log.warning("supabase_signed_get_bad_status", status=resp.status_code, body=resp.text)
                if resp.status_code in (400, 404):
                    if settings.ENVIRONMENT in ("development", "test"):
                        return (
                            f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"
                        )
                    raise ObjectNotFound(storage_key)
        except ObjectNotFound:
            raise
        except Exception as exc:
            log.warning("supabase_signed_get_error", error=str(exc))
            if settings.ENVIRONMENT in ("development", "test"):
                return (
                    f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"
                )
            raise StorageError(f"Failed to generate signed GET URL: {exc}") from exc

    if settings.ENVIRONMENT in ("development", "test"):
        return f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"

    raise StorageError("No storage provider configured to generate signed GET URL")


def _chunks(fileobj: IO[bytes], size: int = 1024 * 1024) -> Iterator[bytes]:
    while chunk := fileobj.read(size):
        yield chunk


def put_object(storage_key: str, fileobj: IO[bytes], mime_type: str, size_bytes: int) -> str:
    """Store an uploaded file server-side and return the value to persist as file_url.

    Used when the browser cannot PUT directly to the bucket (for example when the
    bucket has no CORS rule for the frontend origin). Remote providers return the
    storage key; local disk is used only in development/test and returns a
    /static path, because a container's disk does not survive a redeploy.
    Blocking: call through asyncio.to_thread from request handlers.
    """
    validate_media(mime_type, size_bytes)

    if _is_s3_configured():
        try:
            s3 = _get_s3_client()
            s3.upload_fileobj(
                fileobj,
                settings.STORAGE_BUCKET,
                storage_key,
                ExtraArgs={"ContentType": mime_type},
            )
            log.info("r2_server_upload_stored", storage_key=storage_key, size_bytes=size_bytes)
            return storage_key
        except Exception as exc:
            log.error("r2_server_upload_failed", error=str(exc), storage_key=storage_key)
            if not _is_supabase_configured():
                raise StorageError(f"Upload to storage failed: {exc}") from exc
            fileobj.seek(0)

    if _is_supabase_configured():
        import httpx

        upload_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/"
            f"{settings.STORAGE_BUCKET}/{storage_key}"
        )
        headers = {
            **_supabase_headers(),
            "Content-Type": mime_type,
            "Content-Length": str(size_bytes),
            "x-upsert": "false",
        }
        try:
            with httpx.Client(timeout=300.0) as client:
                resp = client.post(upload_url, headers=headers, content=_chunks(fileobj))
        except Exception as exc:
            raise StorageError(f"Upload to storage failed: {exc}") from exc
        if resp.status_code not in (200, 201):
            raise StorageError(f"Upload to storage failed with HTTP {resp.status_code}: {resp.text[:200]}")
        log.info("supabase_server_upload_stored", storage_key=storage_key, size_bytes=size_bytes)
        return storage_key

    if settings.ENVIRONMENT in ("development", "test"):
        relative = os.path.join("uploads", storage_key)
        destination = os.path.join(_LOCAL_STATIC_DIR, relative)
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        with open(destination, "wb") as out:
            for chunk in _chunks(fileobj):
                out.write(chunk)
        log.info("local_dev_upload_stored", path=destination)
        return "/static/" + relative.replace(os.sep, "/")

    raise StorageError("No storage provider is configured for deliverable uploads")


def public_base_url(request: Any | None) -> str:
    """Absolute origin of this API, honouring the proxy's forwarded scheme/host."""
    if settings.PUBLIC_API_BASE_URL:
        return settings.PUBLIC_API_BASE_URL.rstrip("/")
    if request is None:
        return ""
    headers = request.headers
    scheme = headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    host = headers.get("x-forwarded-host") or headers.get("host") or request.url.netloc
    return f"{scheme}://{host}"


def resolve_media_url(
    raw: str | None,
    request: Any | None = None,
    download_filename: str | None = None,
) -> str | None:
    """Turn a stored file_url into a URL a browser on the frontend origin can load.

    - http(s) URLs pass through unchanged
    - local /static or /uploads paths become absolute API URLs (the SPA is served
      from a different origin, so a relative path would 404 there)
    - storage keys become short-lived signed URLs
    - placeholders such as "uploaded://name" were never stored and resolve to None
    """
    if not raw:
        return None
    if raw.startswith(("http://", "https://")):
        return raw
    if raw.startswith(LOCAL_UPLOAD_PREFIXES):
        return f"{public_base_url(request)}{raw}"
    if "://" in raw:
        return None
    try:
        return signed_get(raw, download_filename=download_filename)
    except Exception as exc:
        log.warning("media_url_sign_failed", key=raw, error=str(exc))
        return None


StorageKind = Literal["upload_intent", "confirm", "signed_get"]
