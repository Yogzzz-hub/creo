import asyncio
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.fair_dispatch_service import assign_client_and_generate_schedule

async def main():
    async with AsyncSessionLocal() as db:
        # Get any client
        result = await db.execute(select(User).where(User.role == "client").limit(1))
        client = result.scalar_one_or_none()
        if not client:
            print("No client found")
            return
            
        print(f"Assigning pod for client {client.id} ({client.email})")
        try:
            res = await assign_client_and_generate_schedule(db, client.id)
            print("Successfully assigned!", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
