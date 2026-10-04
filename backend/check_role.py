import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def main(): 
    async with async_session_maker() as session:
        user = (await session.execute(select(User).where(User.email=='admin@creo.agency'))).scalar_one_or_none()
        print("ROLE:", user.role if user else 'Not Found')

if __name__ == "__main__":
    asyncio.run(main())
