import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get sessions for this project, newest first, excluding checkpoint-writer sessions
PROJECT_ID = 'b154e7f5-cd95-4096-b8ae-993a14397faf'
cur.execute("""
    SELECT id, title, time_created 
    FROM session 
    WHERE project_id = ? 
      AND title NOT LIKE 'checkpoint-writer%'
      AND title NOT LIKE 'Auto Dream%'
    ORDER BY time_created DESC 
    LIMIT 20
""", (PROJECT_ID,))
print("=== RECENT REAL SESSIONS (this project) ===")
for row in cur.fetchall():
    ts = row['time_created']
    print(f"  {row['id']} | {ts} | {row['title']}")

# Also get message + part counts for each session
cur.execute("""
    SELECT s.id, s.title,
           (SELECT COUNT(*) FROM message m WHERE m.session_id = s.id) as msg_count,
           (SELECT COUNT(*) FROM part p WHERE p.session_id = s.id) as part_count
    FROM session s
    WHERE s.project_id = ?
      AND s.title NOT LIKE 'checkpoint-writer%'
      AND s.title NOT LIKE 'Auto Dream%'
    ORDER BY s.time_created DESC
    LIMIT 20
""", (PROJECT_ID,))
print("\n=== MESSAGE/PART COUNTS ===")
for row in cur.fetchall():
    print(f"  {row['id']} | msgs={row['msg_count']} parts={row['part_count']} | {row['title']}")

conn.close()
