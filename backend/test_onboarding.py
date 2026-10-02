import asyncio
import sys
sys.path.append('d:/intern/creo/backend')
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User
from app.services.onboarding_service import complete_onboarding

async def main():
    async with AsyncSessionLocal() as db:
        u = (await db.execute(select(User).where(User.role == 'client').limit(1))).scalar_one_or_none()
        print('Client:', u.email)
        try:
            res = await complete_onboarding(db, u.id)
            print(res)
        except Exception as e:
            print("ERROR", e)

if __name__ == "__main__":
    asyncio.run(main())
