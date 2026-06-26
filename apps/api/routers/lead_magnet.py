from fastapi import APIRouter, Request, status
from pydantic import BaseModel

from core.exceptions import limiter

router = APIRouter(prefix="/api/v1/lead-magnet", tags=["lead-magnet"])


class LeadMagnetRequest(BaseModel):
    email: str


class LeadMagnetResponse(BaseModel):
    status: str
    message: str


@router.post("", response_model=LeadMagnetResponse, status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def capture_lead(request: Request, payload: LeadMagnetRequest):
    # In production, this would:
    # 1. Store the lead in a `leads` table
    # 2. Send a welcome email with the template download link via Resend
    # 3. Optionally trigger a WhatsApp drip sequence via MSG91

    return LeadMagnetResponse(
        status="success",
        message="Check your email for the content calendar template.",
    )
