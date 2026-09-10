import asyncio
import sys
sys.path.insert(0, ".")
from app.db.session import async_session_factory
from sqlalchemy import text

async def list_clients():
    async with async_session_factory() as session:
        query = """
            SELECT id, email, full_name, created_at 
            FROM users 
            WHERE email LIKE '%@gmail.com' OR email LIKE '%@creo.agency'
            ORDER BY created_at DESC;
        """
        res = await session.execute(text(query))
        for r in res.fetchall():
            print(r)

if __name__ == "__main__":
    asyncio.run(list_clients())
