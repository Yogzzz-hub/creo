import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.config import settings  # noqa: E402


async def main() -> None:
    engine = create_async_engine(
        settings.DIRECT_DATABASE_URL, connect_args={"statement_cache_size": 0}
    )
    query = (
        "SELECT u.id, u.email, u.full_name, v.stage "
        "FROM users u JOIN v_client_onboarding v ON u.id = v.client_id "
        "ORDER BY v.stage"
    )
    async with engine.connect() as conn:
        res = await conn.execute(text(query))
        rows = res.fetchall()
        print("CLIENTS AND DERIVED STAGES:")
        for r in rows:
            print(f"ID: {r[0]} | Email: {r[1]} | Name: {r[2]} | Stage: {r[3]}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
