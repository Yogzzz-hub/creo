import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/webhook")
async def verify_webhook(request: Request):
    # Get query parameters sent by Meta
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    verify_token = settings.META_WEBHOOK_VERIFY_TOKEN

    if mode and token:
        if mode == "subscribe" and token == verify_token:
            logger.info("Meta webhook verified successfully.")
            # Return the challenge string as plain text with a 200 OK
            return PlainTextResponse(content=challenge, status_code=200)
        else:
            raise HTTPException(status_code=403, detail="Verification token mismatch")

    raise HTTPException(status_code=400, detail="Invalid request")
