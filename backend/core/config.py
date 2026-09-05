import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv(override=True)


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    RAZORPAY_STARTER_PLAN_ID: str = ""
    RAZORPAY_GROWTH_PLAN_ID: str = ""
    RAZORPAY_PRO_PLAN_ID: str = ""
    MSG91_AUTH_KEY: str = ""
    MSG91_SENDER_ID: str = ""
    MSG91_WHATSAPP_NUMBER: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    OPENAI_API_KEY: str = ""
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_REDIRECT_URI: str = ""
    ENCRYPTION_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = ""
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "https://creo-git-main-yogzzz-hubs-projects.vercel.app"
    DIFY_API_KEY: str = ""
    DIFY_API_URL: str = "https://api.dify.ai/v1"
    GEMINI_API_KEY: str = ""
    META_WEBHOOK_VERIFY_TOKEN: str = "creo_2026"
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "Creo"
    APP_PASSWORD: str = "gcic myxm rrep lorb"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "https://creo-ev42.onrender.com"

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "creotool26@gmail.com"
    SMTP_PASSWORD: str = "gcic myxm rrep lorb"
    SMTP_FROM_EMAIL: str = "creotool26@gmail.com"
    SMTP_FROM_NAME: str = "Creo"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
