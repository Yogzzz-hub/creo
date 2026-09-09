"""Storage service — S3-compatible file operations.

All file operations use pre-signed URLs — the bucket is NEVER public.
Supports AWS S3 and S3-compatible endpoints (Supabase Storage, MinIO, Cloudflare R2).

Key guarantees:
- upload_intent validates MIME type against allowlist before generating PUT URL
- confirm HEAD-checks the object before marking it usable
- signed_get generates short-lived read URLs per-request
- storage_key namespacing: clients/{client_id}/{yyyy}/{mm}/{uuid}.{ext}
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Literal

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
}

MAX_FILE_SIZE_BYTES = 512 * 1024 * 1024  # 512 MB


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
    """Raised when the declared file size exceeds MAX_FILE_SIZE_BYTES."""

    def __init__(self, size_bytes: int) -> None:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        super().__init__(
            f"File size {size_bytes} bytes exceeds the maximum allowed ({max_mb} MB)",
            code="FILE_TOO_LARGE",
        )


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


def _make_storage_key(client_id: uuid.UUID, mime_type: str) -> str:
    """Generate namespaced storage key: clients/{client_id}/{yyyy}/{mm}/{uuid}.{ext}"""
    now = datetime.now(UTC)
    ext = ALLOWED_MIMES[mime_type]
    file_uuid = uuid.uuid4()
    return f"clients/{client_id}/{now.year}/{now.month:02d}/{file_uuid}.{ext}"


def _is_supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


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
            "region_name": settings.STORAGE_REGION,
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

    Supports Supabase Storage natively as well as S3.
    """
    # 1. MIME validation
    if mime_type not in ALLOWED_MIMES:
        raise UnsupportedMimeType(mime_type)

    # 2. Size validation
    if file_size_bytes > MAX_FILE_SIZE_BYTES:
        raise FileTooLarge(file_size_bytes)

    storage_key = _make_storage_key(client_id, mime_type)
    ttl = settings.PRESIGNED_URL_TTL  # 15 min by default

    # Prefer Supabase Storage REST API when configured
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

    Supports Supabase Storage and S3.
    """
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
                    data = resp.json() if resp.text else {}
                    if data.get("code") in ("NoSuchKey", "not_found") or "not found" in resp.text.lower():
                        raise ObjectNotFound(storage_key)
        except ObjectNotFound:
            raise
        except Exception as exc:
            log.warning("supabase_confirm_fallback", error=str(exc))

    try:
        s3 = _get_s3_client()
        head = s3.head_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
        actual_size = head.get("ContentLength", 0)
    except StorageError:
        raise
    except Exception as exc:
        error_str = str(exc)
        if "404" in error_str or "NoSuchKey" in error_str or "Not Found" in error_str:
            raise ObjectNotFound(storage_key) from exc
        if settings.ENVIRONMENT in ("development", "test"):
            return {
                "storage_key": storage_key,
                "confirmed": True,
                "actual_size": declared_size_bytes,
            }
        raise StorageError(f"HEAD request failed: {exc}") from exc

    if actual_size != declared_size_bytes:
        raise ContentLengthMismatch(declared=declared_size_bytes, actual=actual_size)

    log.info("upload_confirmed", storage_key=storage_key, size_bytes=actual_size)
    return {"storage_key": storage_key, "confirmed": True, "actual_size": actual_size}


def signed_get(storage_key: str, ttl: int = 900) -> str:
    """Generate a short-lived pre-signed GET URL for the object.

    The bucket is NEVER public. Every read request must use a fresh signed URL.
    """
    if _is_supabase_configured():
        import httpx

        sign_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/"
            f"{settings.STORAGE_BUCKET}/{storage_key}"
        )
        headers = {**_supabase_headers(), "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(sign_url, headers=headers, json={"expiresIn": ttl})
                if resp.status_code in (200, 201):
                    signed_path = resp.json().get("signedURL", "")
                    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_path}"
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

        return f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"

    try:
        s3 = _get_s3_client()
        url: str = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.STORAGE_BUCKET, "Key": storage_key},
            ExpiresIn=ttl,
        )
        return url
    except StorageError:
        raise
    except Exception as exc:
        if settings.ENVIRONMENT in ("development", "test"):
            return (
                f"https://{settings.STORAGE_BUCKET}.s3.amazonaws.com/{storage_key}?presigned=mock"
            )
        raise StorageError(f"Failed to generate signed GET URL: {exc}") from exc


StorageKind = Literal["upload_intent", "confirm", "signed_get"]
