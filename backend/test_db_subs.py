import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings
from app.models.billing import Subscription, Plan
from app.models.user import User

async def main() -> None:
    engine = create_async_engine(settings.DIRECT_DATABASE_URL, echo=False, future=True)
    async_session = async_sessionmaker(bind=engine, expire_on_commit=False)
    
    async with async_session() as db:
        stmt = select(User, Subscription, Plan).join(Subscription, User.id == Subscription.client_id).join(Plan, Subscription.plan_id == Plan.id)
        rows = (await db.execute(stmt)).all()
        for u, s, p in rows:
            print(f"User: {u.email}, Plan: {p.name}, Price: {s.amount}")

if __name__ == "__main__":
    asyncio.run(main())
