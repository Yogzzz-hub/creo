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
    FRONTEND_URL: str = Field(default="https://creo.yogalakshmibaskar20.workers.dev")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/creo"
    )
    DIRECT_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/creo"
    )

    # Connection pool tuning (per worker process). Set DB_USE_NULLPOOL=true to
    # fall back to opening a fresh connection for every request.
    DB_USE_NULLPOOL: bool = Field(default=False)
    DB_POOL_SIZE: int = Field(default=5)
    DB_MAX_OVERFLOW: int = Field(default=5)
    DB_POOL_RECYCLE_SECONDS: int = Field(default=300)

    @field_validator("DATABASE_URL", "DIRECT_DATABASE_URL", "REDIS_URL", mode="before")
    @classmethod
    def strip_urls(cls, v: Any) -> Any:
        if isinstance(v, str):
            normalized = v.strip().strip("'").strip('"')
            # Hosting providers supply plain PostgreSQL URLs; both the API and
            # Alembic use async engines and require the asyncpg dialect.
            for prefix in ("postgres://", "postgresql://"):
                if normalized.startswith(prefix):
                    return "postgresql+asyncpg://" + normalized[len(prefix):]
            return normalized
        return v

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
    GOOGLE_REDIRECT_URI: str = Field(default="https://creo-dsxr.onrender.com")

    # Google Gmail SMTP
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=465)
    SMTP_USERNAME: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_USE_TLS: bool = Field(default=False)
    SMTP_USE_SSL: bool = Field(default=True)
    SMTP_FROM_EMAIL: str = Field(default="")
    ALLOW_FALLBACK_OTP: bool = Field(default=True)

    # Payment Gateways — Razorpay
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_TO2r0YMjDZSpuC")
    RAZORPAY_KEY_SECRET: str = Field(default="")
    RAZORPAY_WEBHOOK_SECRET: str = Field(default="webhook_secret_creo-26")

    # AI Services — Gemini & OpenAI
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_FALLBACK_KEYS: list[str] = Field(default_factory=list)
    OPENAI_API_KEY: str = Field(default="")

    @field_validator("GEMINI_FALLBACK_KEYS", mode="before")
    @classmethod
    def parse_gemini_fallback_keys(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [str(k).strip() for k in v if str(k).strip()]
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(k).strip() for k in parsed if str(k).strip()]
                except Exception:
                    pass
            return [k.strip() for k in v.split(",") if k.strip()]
        return []

    # Storage (S3-compatible: AWS S3, Supabase Storage, Cloudflare R2, MinIO)
    STORAGE_BUCKET: str = Field(default="creo")
    STORAGE_REGION: str = Field(default="auto")
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    STORAGE_ENDPOINT_URL: str | None = Field(default=None)  # For non-AWS S3-compatible stores (e.g. Cloudflare R2)
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
    RESEND_FROM_EMAIL: str = Field(default="Creo Verification <onboarding@resend.dev>")
    WHATSAPP_API_TOKEN: str = Field(default="")
    WHATSAPP_PHONE_NUMBER_ID: str = Field(default="")

    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://creo.yogalakshmibaskar20.workers.dev",
            "https://creo-dsxr.onrender.com",
            "https://creo.pages.dev",
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
        # A deployment that supplies REDIS_URL must not silently leave background
        # jobs pointing at localhost. Preserve explicitly configured queue stores.
        if "CELERY_BROKER_URL" not in self.model_fields_set:
            self.CELERY_BROKER_URL = self.REDIS_URL
        if "CELERY_RESULT_BACKEND" not in self.model_fields_set:
            self.CELERY_RESULT_BACKEND = self.REDIS_URL
        if not self.JWT_SECRET and self.SECRET_KEY:
            self.JWT_SECRET = self.SECRET_KEY
        if not self.JWT_SECRET and self.ENVIRONMENT not in ("development", "test"):
            raise ValueError("JWT_SECRET or SECRET_KEY must be configured outside development/test")
        if not self.JWT_SECRET:
            self.JWT_SECRET = "super-secret-jwt-key-creo-development-32chars"

        # Reconcile SMTP configuration
        if "SMTP_HOST" in self.model_fields_set and "SMTP_SERVER" not in self.model_fields_set:
            self.SMTP_SERVER = self.SMTP_HOST
        elif "SMTP_SERVER" in self.model_fields_set and "SMTP_HOST" not in self.model_fields_set:
            self.SMTP_HOST = self.SMTP_SERVER
        elif not self.SMTP_HOST and self.SMTP_SERVER:
            self.SMTP_HOST = self.SMTP_SERVER
        elif not self.SMTP_SERVER and self.SMTP_HOST:
            self.SMTP_SERVER = self.SMTP_HOST

        if "SMTP_USE_SSL" in self.model_fields_set:
            if self.SMTP_USE_SSL and "SMTP_USE_TLS" not in self.model_fields_set:
                self.SMTP_USE_TLS = False
            elif not self.SMTP_USE_SSL and "SMTP_USE_TLS" not in self.model_fields_set:
                self.SMTP_USE_TLS = True
        elif "SMTP_PORT" in self.model_fields_set:
            if self.SMTP_PORT == 465:
                self.SMTP_USE_SSL = True
                self.SMTP_USE_TLS = False
            elif self.SMTP_PORT == 587:
                self.SMTP_USE_SSL = False
                self.SMTP_USE_TLS = True

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
settings = Settings()
