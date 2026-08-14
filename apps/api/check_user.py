import asyncio
import logging
from sqlalchemy import select
from core.database import async_session
from models.user import User

async def main():
    print("Checking for all users in the database...")
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users.")
        for user in users:
            print(f"ID={user.id}, auth_id={user.auth_id}, email={user.email}, role={user.role}")

if __name__ == "__main__":
    asyncio.run(main())
