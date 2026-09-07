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


def _get_s3_client() -> Any:
    """Lazily create a boto3 S3 client (avoids import cost at module level)."""
    try:
        import boto3

        kwargs: dict[str, object] = {
            "region_name": settings.STORAGE_REGION,
        }
        if settings.AWS_ACCESS_KEY_ID:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        if settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        if settings.STORAGE_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.STORAGE_ENDPOINT_URL

        return boto3.client("s3", **kwargs)
    except ImportError as exc:
        raise StorageError(
            "boto3 is not installed. Add it to pyproject.toml dependencies.",
            code="BOTO3_MISSING",
        ) from exc


def upload_intent(
    client_id: uuid.UUID,
    mime_type: str,
    file_size_bytes: int,
) -> dict[str, object]:
    """Validate upload parameters and return a pre-signed S3 PUT URL.

    Args:
        client_id: Owner of the file for namespaced storage key.
        mime_type: Must be in ALLOWED_MIMES.
        file_size_bytes: Declared size — must be <= 512 MB.

    Returns:
        {"storage_key": str, "upload_url": str, "expires_in": int}

    Raises:
        UnsupportedMimeType: For disallowed MIME types.
        FileTooLarge: When declared size exceeds 512 MB.
    """
    # 1. MIME validation
    if mime_type not in ALLOWED_MIMES:
        raise UnsupportedMimeType(mime_type)

    # 2. Size validation
    if file_size_bytes > MAX_FILE_SIZE_BYTES:
        raise FileTooLarge(file_size_bytes)

    storage_key = _make_storage_key(client_id, mime_type)
    ttl = settings.PRESIGNED_URL_TTL  # 15 min by default

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
        # In dev without S3 credentials, return a placeholder URL so the rest of
        # the system can be tested. In production this would propagate the error.
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
    """HEAD the S3 object and verify it exists with the correct content-length.

    Args:
        storage_key: The key returned from upload_intent.
        declared_size_bytes: The size the client said the file would be.

    Returns:
        {"storage_key": str, "confirmed": True, "actual_size": int}

    Raises:
        ObjectNotFound: Object is missing from S3.
        ContentLengthMismatch: Actual size differs from declared size.
    """
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
            # Mock confirmation in dev — treat as 1:1 match
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


def signed_get(storage_key: str, ttl: int = 300) -> str:
    """Generate a short-lived pre-signed GET URL for the object.

    The bucket is NEVER public. Every read request must use a fresh signed URL.

    Args:
        storage_key: The S3 object key.
        ttl: URL validity in seconds (default: 5 minutes).

    Returns:
        A pre-signed HTTPS URL valid for `ttl` seconds.
    """
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
