import asyncio
import sys
import uuid
sys.path.append('d:/intern/creo/backend')
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User
from app.services.brand_dna import run_brand_dna_pipeline

async def main():
    async with AsyncSessionLocal() as db:
        u = (await db.execute(select(User).where(User.role == 'client').limit(1))).scalar_one_or_none()
        print('Client:', u.email)
        try:
            res = await run_brand_dna_pipeline(db, u.id, notify_team=False)
            print("SUCCESS", res)
        except Exception as e:
            print("ERROR", str(e))
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
