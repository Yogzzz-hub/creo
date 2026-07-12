import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from core.config import settings
from core.security import require_active_client
from schemas.chatbot import ChatbotRequest, ChatbotResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])


@router.post("", response_model=ChatbotResponse)
async def chat_with_bot(
    payload: ChatbotRequest,
    current_user=Depends(require_active_client),
):
    logger.info(
        "[chatbot] incoming request user=%s message_length=%d conversation_id=%s",
        current_user.id,
        len(payload.message),
        payload.conversation_id,
    )

    if not settings.DIFY_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chatbot is not configured. Please contact support.",
        )

    dify_url = f"{settings.DIFY_API_URL.rstrip('/')}/chat-messages"

    request_body: dict = {
        "inputs": {},
        "query": payload.message,
        "response_mode": "blocking",
        "user": current_user.id,
    }
    if payload.conversation_id:
        request_body["conversation_id"] = payload.conversation_id

    headers = {
        "Authorization": f"Bearer {settings.DIFY_API_KEY}",
        "Content-Type": "application/json",
    }

    logger.info("[chatbot] sending request to Dify: %s", dify_url)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(dify_url, json=request_body, headers=headers)

        logger.info("[chatbot] Dify response status=%d", resp.status_code)

        if resp.status_code == 401:
            logger.error("[chatbot] Dify API key is invalid or expired")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Chatbot authentication failed. Please contact support.",
            )

        if resp.status_code != 200:
            logger.error(
                "[chatbot] Dify returned status=%d body=%s",
                resp.status_code,
                resp.text[:500],
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Chatbot is temporarily unavailable. Please try again.",
            )

        data = resp.json()
        logger.info(
            "[chatbot] parsed Dify response conversation_id=%s answer_length=%d",
            data.get("conversation_id"),
            len(data.get("answer", "")),
        )

        return ChatbotResponse(
            reply=data.get("answer", "I could not generate a response. Please try again."),
            conversation_id=data.get("conversation_id"),
            escalate=False,
        )

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("[chatbot] Dify request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Chatbot took too long to respond. Please try again.",
        )
    except Exception:
        logger.exception("[chatbot] unexpected error calling Dify")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        )
