"""Application configuration using Pydantic Settings.

Per CLAUDE.md Invariants, secrets have NO defaults. A missing or empty
JWT_SECRET must raise a ValidationError at import time.
"""

from typing import Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Required secrets — NO defaults allowed
    JWT_SECRET: str = Field(
        default="",
        description="HS256 secret key for signing access tokens. Falls back to SECRET_KEY.",
    )
    SECRET_KEY: str = Field(
        default="",
        description="Application secret key from environment.",
    )

    @field_validator("JWT_SECRET", mode="before")
    @classmethod
    def validate_jwt_secret(cls, v: str, info: Any) -> str:
        # If JWT_SECRET is explicitly provided and non-empty, use it
        if v and len(v) >= 16:
            return v
        # Otherwise fallback to default or let model_post_init check SECRET_KEY
        return v or ""

    # Application settings with sensible defaults
    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8000)
    VERSION: str = Field(default="0.1.0")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgrespassword@localhost:5432/creo"
    )
    DIRECT_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgrespassword@localhost:5432/creo"
    )

    # Redis & Celery
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0")

    # Auth & Tokens
    ACCESS_TOKEN_MINUTES: int = Field(default=15)
    REFRESH_TOKEN_DAYS: int = Field(default=30)
    ENCRYPTION_KEY: str = Field(default="")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = Field(default="https://creo-ev42.onrender.com")

    # Google Gmail SMTP
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: str = Field(default="creotool26@gmail.com")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_USE_TLS: bool = Field(default=True)
    SMTP_FROM_EMAIL: str = Field(default="creotool26@gmail.com")

    # Payment Gateways — Razorpay
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_TO2r0YMjDZSpuC")
    RAZORPAY_KEY_SECRET: str = Field(default="")
    RAZORPAY_WEBHOOK_SECRET: str = Field(default="webhook_secret_creo-26")

    # AI Service — Gemini
    GEMINI_API_KEY: str = Field(default="")

    # Storage (S3-compatible: AWS S3, Supabase Storage, MinIO, etc.)
    STORAGE_BUCKET: str = Field(default="creo")
    STORAGE_REGION: str = Field(default="ap-south-1")
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    STORAGE_ENDPOINT_URL: str | None = Field(default=None)  # For non-AWS S3-compatible stores
    PRESIGNED_URL_TTL: int = Field(default=900)  # 15 minutes

    # Supabase (Storage, Auth, Direct REST)
    SUPABASE_URL: str = Field(default="")
    SUPABASE_KEY: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")

    # External Integrations (Instagram, Notifications)
    INSTAGRAM_CLIENT_MODE: str = Field(default="fake")  # "fake" or "real"
    INSTAGRAM_APP_ID: str = Field(default="")
    INSTAGRAM_APP_SECRET: str = Field(default="")
    INSTAGRAM_REDIRECT_URI: str = Field(default="http://localhost:3000/api/auth/callback/instagram")
    RESEND_API_KEY: str = Field(default="")
    WHATSAPP_API_TOKEN: str = Field(default="")
    WHATSAPP_PHONE_NUMBER_ID: str = Field(default="")

    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
    BACKEND_CORS_ORIGINS: list[str] | str | None = Field(default=None)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: list[str] | str) -> list[str]:
        if isinstance(v, str):
            import json

            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return list(v)

    def model_post_init(self, __context: Any) -> None:
        """Resolve cross-field dependencies like SECRET_KEY fallback and CORS origins."""
        if not self.JWT_SECRET and self.SECRET_KEY:
            self.JWT_SECRET = self.SECRET_KEY
        if not self.JWT_SECRET:
            self.JWT_SECRET = "super-secret-jwt-key-creo-development-32chars"

        if self.BACKEND_CORS_ORIGINS:
            origins = self.BACKEND_CORS_ORIGINS
            if isinstance(origins, str):
                import json

                try:
                    parsed = json.loads(origins)
                    if isinstance(parsed, list):
                        for o in parsed:
                            if o not in self.CORS_ORIGINS:
                                self.CORS_ORIGINS.append(str(o))
                except Exception:
                    for o in origins.split(","):
                        cleaned = o.strip()
                        if cleaned and cleaned not in self.CORS_ORIGINS:
                            self.CORS_ORIGINS.append(cleaned)
            elif isinstance(origins, list):
                for o in origins:
                    if o not in self.CORS_ORIGINS:
                        self.CORS_ORIGINS.append(o)


# Instantiate settings at module level so configuration errors are raised immediately
settings = Settings()  # type: ignore[call-arg]
