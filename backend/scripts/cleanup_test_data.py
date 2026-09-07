import asyncio
from sqlalchemy import text
from app.db.session import async_session_factory

async def main():
    async with async_session_factory() as s:
        # Delete audit logs
        await s.execute(text("""
            DELETE FROM audit_log 
            WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
               OR entity_id IN (SELECT id FROM deliverables WHERE file_url LIKE 'test/%')
        """))
        
        # Delete deliverables
        await s.execute(text("""
            DELETE FROM deliverables 
            WHERE file_url LIKE 'test/%' 
               OR client_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
        """))
        
        # Delete usage counters
        await s.execute(text("""
            DELETE FROM usage_counters 
            WHERE client_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
        """))
        
        # Delete subscriptions
        await s.execute(text("""
            DELETE FROM subscriptions 
            WHERE client_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
        """))
        
        # Delete test plans if any
        await s.execute(text("""
            DELETE FROM plans 
            WHERE name NOT IN ('starter', 'growth', 'pro')
        """))
        
        # Delete users
        await s.execute(text("""
            DELETE FROM users 
            WHERE email LIKE '%@test.com'
        """))
        
        await s.commit()
        print("DATABASE TEST DATA CLEANUP COMPLETE")

if __name__ == "__main__":
    asyncio.run(main())
