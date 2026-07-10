import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# 1. List all sessions
print("=== SESSIONS (newest first) ===")
cur.execute("SELECT id, project_id, title, time_created FROM session ORDER BY time_created DESC")
for row in cur.fetchall():
    pid = (row['project_id'] or '')[:16]
    print(f"  {row['id']} | pid={pid} | {row['title'] or '(no title)'} | {row['time_created']}")

# 2. Session count
cur.execute("SELECT COUNT(*) as cnt FROM session")
print(f"\nTotal sessions: {cur.fetchone()['cnt']}")

# 3. Tables overview
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r['name'] for r in cur.fetchall()]
print(f"\nTables: {', '.join(tables)}")

for t in tables:
    cur.execute(f"SELECT COUNT(*) as cnt FROM [{t}]")
    cnt = cur.fetchone()['cnt']
    if cnt > 0:
        print(f"  {t}: {cnt} rows")

conn.close()
