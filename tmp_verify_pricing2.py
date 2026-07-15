import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

SESSION_ID = 'ses_0b453de46ffetTJVmBjgI3hExg'

def safe_json(val):
    if val is None:
        return {}
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val)
    except:
        return {}

# Get all parts that are write/edit tool calls
cur.execute("""
    SELECT p.data as part_data
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') IN ('edit', 'write')
    ORDER BY p.time_created
""", (SESSION_ID,))

print("=== WRITE/EDIT OPERATIONS IN PRICING SESSION ===")
for row in cur.fetchall():
    data = safe_json(row['part_data'])
    tool = data.get('tool', '?')
    state = data.get('state', {})
    inp = safe_json(state.get('input', '{}'))
    out = state.get('output', '')
    
    if tool == 'write':
        fp = inp.get('file_path', '')
        content = inp.get('content', '')[:300]
        print(f"\n  [WRITE] {fp}")
        print(f"    Content preview: {content}")
    elif tool == 'edit':
        fp = inp.get('file_path', '')
        old = (inp.get('old_string', '') or '')[:150]
        new = (inp.get('new_string', '') or '')[:150]
        print(f"\n  [EDIT] {fp}")
        print(f"    old: {old}")
        print(f"    new: {new}")

# Check final text output
cur.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'text'
      AND json_extract(p.data, '$.text') IS NOT NULL
      AND length(json_extract(p.data, '$.text')) > 50
    ORDER BY p.time_created DESC
    LIMIT 3
""", (SESSION_ID,))
print("\n\n=== FINAL TEXT OUTPUTS ===")
for row in cur.fetchall():
    text = row['text'] or ''
    if text.strip():
        print(f"  {text[:800]}")
        print()

# Check task status
cur.execute("""
    SELECT p.data as part_data
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'task'
    ORDER BY p.time_created
""", (SESSION_ID,))
print("\n=== TASK OPERATIONS ===")
for row in cur.fetchall():
    data = safe_json(row['part_data'])
    state = data.get('state', {})
    inp = safe_json(state.get('input', '{}'))
    out = state.get('output', '')
    op = inp.get('operation', {})
    print(f"  {op.get('action', '?')}: id={op.get('id', '?')} summary={op.get('summary', '')[:80]} -> {out}")

conn.close()
