import asyncio
import sys
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, email, full_name, role, onboarding_stage FROM users WHERE full_name ILIKE '%Apex%' OR email ILIKE '%Apex%'"))
        users = res.fetchall()
        print('Users:', users)
        for u in users:
            uid = u[0]
            subs = (await conn.execute(text("SELECT id, status, plan_id FROM subscriptions WHERE client_id = :uid"), {"uid": uid})).fetchall()
            print('Subs:', subs)
            dels = (await conn.execute(text("SELECT id, title, status FROM deliverables WHERE client_id = :uid"), {"uid": uid})).fetchall()
            print(f'Deliverables count: {len(dels)}')
            for d in dels:
                print(' ', d)
            cals = (await conn.execute(text("SELECT id, title, status FROM calendar_entries WHERE client_id = :uid"), {"uid": uid})).fetchall()
            print(f'Calendar count: {len(cals)}')
            for c in cals:
                print(' ', c)

if __name__ == '__main__':
    asyncio.run(main())
