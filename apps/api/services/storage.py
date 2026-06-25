import hashlib

from supabase import create_client

from core.config import settings

_supabase_client = None
_supabase_key_hash: str | None = None


def _get_supabase_client():
    global _supabase_client, _supabase_key_hash
    current_key = settings.SUPABASE_SERVICE_ROLE_KEY
    current_url = settings.SUPABASE_URL
    key_hash = hashlib.sha256(f"{current_url}:{current_key}".encode()).hexdigest()

    if _supabase_client is None or _supabase_key_hash != key_hash:
        _supabase_client = create_client(current_url, current_key)
        _supabase_key_hash = key_hash

    return _supabase_client


def generate_signed_download_url(
    bucket_name: str, file_path: str, expires_in: int = 3600
) -> str:
    client = _get_supabase_client()
    result = client.storage.from_(bucket_name).create_signed_url(
        file_path, expires_in
    )
    signed_url = result.get("signedURL") or result.get("signed_url")
    if not signed_url:
        raise ValueError(
            f"Failed to generate signed URL for {bucket_name}/{file_path}"
        )
    return signed_url


def generate_signed_upload_url(
    bucket_name: str, file_path: str, expires_in: int = 3600
) -> str:
    client = _get_supabase_client()
    result = client.storage.from_(bucket_name).create_signed_upload_url(file_path)
    signed_url = result.get("signedURL") or result.get("signed_url") or result.get("token")
    if not signed_url:
        raise ValueError(
            f"Failed to generate signed upload URL for {bucket_name}/{file_path}"
        )
    return signed_url


def delete_user_files(user_id: str, bucket_name: str = "deliverables") -> int:
    client = _get_supabase_client()
    deleted_count = 0
    try:
        files = client.storage.from_(bucket_name).list(user_id)
        if files:
            file_paths = [f"{user_id}/{f['name']}" for f in files]
            client.storage.from_(bucket_name).remove(file_paths)
            deleted_count = len(file_paths)
    except Exception:
        pass
    return deleted_count
