import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from core.config import settings
from core.security import require_client
from schemas.chatbot import ChatbotRequest, ChatbotResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/chatbot",
    tags=["chatbot"],
)


@router.post("", response_model=ChatbotResponse)
async def chat_with_bot(
    payload: ChatbotRequest,
    current_user=Depends(require_client),
):
    logger.info(
        "[chatbot] incoming request user=%s message_length=%d conversation_id=%s",
        current_user.id,
        len(payload.message),
        payload.conversation_id,
    )

    if not settings.DIFY_API_KEY:
        logger.error(
            "[chatbot] DIFY_API_KEY is not configured"
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Chatbot is not configured. "
                "Please contact support."
            ),
        )

    dify_url = (
        f"{settings.DIFY_API_URL.rstrip('/')}"
        "/chat-messages"
    )

    request_body: dict = {
        "inputs": {},
        "query": payload.message,
        "response_mode": "blocking",
        "user": str(current_user.id),
    }

    if payload.conversation_id:
        request_body["conversation_id"] = (
            payload.conversation_id
        )

    headers = {
        "Authorization": (
            f"Bearer {settings.DIFY_API_KEY}"
        ),
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    logger.info(
        "[chatbot] sending request to Dify: %s",
        dify_url,
    )

    try:
        async with httpx.AsyncClient(
            timeout=60.0
        ) as client:

            resp = await client.post(
                dify_url,
                json=request_body,
                headers=headers,
            )

        logger.info(
            "[chatbot] Dify response status=%d",
            resp.status_code,
        )

        # Invalid Dify API key
        if resp.status_code == 401:
            logger.error(
                "[chatbot] Dify API key is invalid or expired"
            )

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Chatbot authentication failed. "
                    "Please contact support."
                ),
            )

        # Dify configuration / workflow errors
        if resp.status_code == 400:

            try:
                error_data = resp.json()

                error_code = error_data.get(
                    "code"
                )

                error_message = error_data.get(
                    "message",
                    "Invalid request",
                )

                logger.error(
                    "[chatbot] Dify returned 400: "
                    "code=%s message=%s",
                    error_code,
                    error_message,
                )

                if (
                    error_code == "invalid_param"
                    and "not published"
                    in error_message.lower()
                ):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_502_BAD_GATEWAY
                        ),
                        detail=(
                            "The chatbot workflow "
                            "has not been published "
                            "in Dify. Please publish "
                            "the workflow in Dify "
                            "and try again."
                        ),
                    )

                raise HTTPException(
                    status_code=(
                        status.HTTP_502_BAD_GATEWAY
                    ),
                    detail=(
                        f"Dify error: {error_message}"
                    ),
                )

            except HTTPException:
                raise

            except Exception:
                logger.error(
                    "[chatbot] Dify returned 400 "
                    "with invalid JSON: %s",
                    resp.text[:500],
                )

                raise HTTPException(
                    status_code=(
                        status.HTTP_502_BAD_GATEWAY
                    ),
                    detail=(
                        "Invalid request sent "
                        "to chatbot service."
                    ),
                )

        # Other Dify errors
        if resp.status_code != 200:
            logger.error(
                "[chatbot] Dify returned status=%d body=%s",
                resp.status_code,
                resp.text[:500],
            )

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Chatbot is temporarily "
                    "unavailable. Please try again."
                ),
            )

        # Parse Dify response
        try:
            data = resp.json()

        except Exception:
            logger.error(
                "[chatbot] Could not parse Dify response: %s",
                resp.text[:500],
            )

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Invalid response received "
                    "from chatbot service."
                ),
            )

        answer = data.get(
            "answer",
            "",
        )

        conversation_id = data.get(
            "conversation_id"
        )

        logger.info(
            "[chatbot] parsed Dify response "
            "conversation_id=%s answer_length=%d",
            conversation_id,
            len(answer),
        )

        if not answer:
            logger.warning(
                "[chatbot] Dify returned an empty answer"
            )

            answer = (
                "I could not generate a response. "
                "Please try again."
            )

        return ChatbotResponse(
            reply=answer,
            conversation_id=conversation_id,
            escalate=False,
        )

    except HTTPException:
        raise

    except httpx.TimeoutException:
        logger.error(
            "[chatbot] Dify request timed out"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_504_GATEWAY_TIMEOUT
            ),
            detail=(
                "Chatbot took too long to respond. "
                "Please try again."
            ),
        )

    except httpx.ConnectError:
        logger.error(
            "[chatbot] Could not connect to Dify"
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not connect to chatbot service. "
                "Please try again."
            ),
        )

    except httpx.RequestError as exc:
        logger.error(
            "[chatbot] Dify request failed: %s",
            str(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Chatbot service is currently "
                "unavailable. Please try again."
            ),
        )

    except Exception:
        logger.exception(
            "[chatbot] unexpected error calling Dify"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An unexpected error occurred. "
                "Please try again."
            ),
        )