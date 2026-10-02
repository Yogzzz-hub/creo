import asyncio
import sys
import httpx
sys.path.append('d:/intern/creo/backend')
from app.main import app

async def test_apis():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/portal/deliverables")
        print("Portal Deliverables:", res.status_code, res.text)
        
        res = await ac.get("/api/v1/tickets")
        print("Tickets:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(test_apis())
