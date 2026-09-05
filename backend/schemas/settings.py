from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class IntegrationStatus(BaseModel):
    razorpay: bool
    stripe: bool
    msg91: bool
    resend: bool
    openai: bool
    instagram: bool
    supabase: bool
    redis: bool
    celery: bool

class PlatformConfigStatus(BaseModel):
    environment: str
    integrations: IntegrationStatus

class PlatformSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sla_delivery_days: int = Field(default=3, ge=1, le=30)
    sla_revision_hours: int = Field(default=48, ge=1, le=720)
    updated_at: Optional[datetime] = None
    config: Optional[PlatformConfigStatus] = None


class PlatformSettingsUpdate(BaseModel):
    sla_delivery_days: Optional[int] = Field(default=None, ge=1, le=30)
    sla_revision_hours: Optional[int] = Field(default=None, ge=1, le=720)
