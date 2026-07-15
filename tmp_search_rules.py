import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

PROJECT_ID = 'b154e7f5-cd95-4096-b8ae-993a14397faf'

# Get session IDs for this project
cur.execute("SELECT id FROM session WHERE project_id = ?", (PROJECT_ID,))
session_ids = [r['id'] for r in cur.fetchall()]
placeholders = ','.join('?' * len(session_ids))

# Search for user statements with rules/decisions keywords
keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'prefer', 'must']
print("=== USER STATEMENTS WITH RULES/DECISIONS ===")
for kw in keywords:
    cur.execute(f"""
        SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 500) as text
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id IN ({placeholders})
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND json_extract(p.data, '$.text') LIKE ?
        LIMIT 5
    """, session_ids + [f'%{kw}%'])
    rows = cur.fetchall()
    if rows:
        print(f"\n  --- keyword: '{kw}' ---")
        for row in rows:
            text = row['text'] or ''
            print(f"    [{row['session_id'][:20]}] {text[:300]}")

# Search for repeated error patterns
print("\n\n=== REPEATED ERRORS ===")
cur.execute(f"""
    SELECT json_extract(p.data, '$.tool') as tool,
           substr(json_extract(p.data, '$.state.output'), 1, 200) as output,
           COUNT(*) as cnt
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id IN ({placeholders})
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.state.output') LIKE '%error%'
    GROUP BY tool, substr(json_extract(p.data, '$.state.output'), 1, 100)
    HAVING cnt > 1
    ORDER BY cnt DESC
    LIMIT 10
""", session_ids)
for row in cur.fetchall():
    print(f"  {row['tool']} (x{row['cnt']}): {row['output'][:200]}")

# Look for decision statements in assistant text
print("\n\n=== ASSISTANT DECISION STATEMENTS ===")
cur.execute(f"""
    SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 500) as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id IN ({placeholders})
      AND json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'text'
      AND (json_extract(p.data, '$.text') LIKE '%decided%'
           OR json_extract(p.data, '$.text') LIKE '%will not%'
           OR json_extract(p.data, '$.text') LIKE '%should%'
           OR json_extract(p.data, '$.text') LIKE '%pattern%')
    LIMIT 10
""", session_ids)
for row in cur.fetchall():
    text = row['text'] or ''
    print(f"  [{row['session_id'][:20]}] {text[:400]}")

conn.close()
