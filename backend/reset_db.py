import asyncio
import asyncpg

async def reset():
    print("Connecting to DB...")
    conn = await asyncpg.connect('postgresql://postgres:Kameshwari2008@127.0.0.1:5432/creo')
    print("Dropping schema...")
    await conn.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;')
    print("Schema dropped and recreated.")
    await conn.close()

asyncio.run(reset())
