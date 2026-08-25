from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

router = APIRouter()

@router.get("/api/webhook")
async def verify_webhook(request: Request):
    # Get query parameters sent by Meta
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    # Verify the token you set (change 'creo_2026' if you used a different verify token)
    VERIFY_TOKEN = "creo_2026"

    if mode and token:
        if mode == "subscribe" and token == VERIFY_TOKEN:
            print("WEBHOOK_VERIFIED")
            # Return the challenge string as plain text with a 200 OK
            return PlainTextResponse(content=challenge, status_code=200)
        else:
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    raise HTTPException(status_code=400, detail="Invalid request")
