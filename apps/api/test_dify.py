import httpx
from core.config import settings

print("DIFY URL:", settings.DIFY_API_URL)
print("API KEY EXISTS:", bool(settings.DIFY_API_KEY))

url = settings.DIFY_API_URL.rstrip("/") + "/chat-messages"

headers = {
    "Authorization": "Bearer " + settings.DIFY_API_KEY,
    "Content-Type": "application/json",
}

body = {
    "inputs": {},
    "query": "Hello",
    "response_mode": "blocking",
    "user": "test-user",
}

print("REQUEST URL:", url)

try:
    response = httpx.post(
        url,
        json=body,
        headers=headers,
        timeout=60,
    )

    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)

except Exception as e:
    print("ERROR:", repr(e))