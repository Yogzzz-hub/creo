from supabase import create_client

from core.config import settings

_supabase_client = None


def _get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
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
